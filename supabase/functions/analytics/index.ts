import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface GetStatsRequest {
  barbershop_id: string
  start_date?: string
  end_date?: string
}

interface GetBarberStatsRequest {
  barber_id: string
  start_date?: string
  end_date?: string
}

interface GetRevenueReportRequest {
  barbershop_id: string
  start_date: string
  end_date: string
  group_by?: 'day' | 'week' | 'month'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the JWT token and verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Get barbershop statistics
    if (method === 'POST' && path === 'barbershop-stats') {
      const body: GetStatsRequest = await req.json()
      
      if (!body.barbershop_id) {
        throw new Error('Missing barbershop ID')
      }

      // Check if user is owner
      const { data: barbershop } = await supabaseClient
        .from('barbershops')
        .select('owner_id')
        .eq('id', body.barbershop_id)
        .single()

      if (!barbershop || barbershop.owner_id !== user.id) {
        throw new Error('Unauthorized')
      }

      // Get stats using the stored function
      const { data: stats, error: statsError } = await supabaseClient
        .rpc('get_barbershop_stats', {
          p_barbershop_id: body.barbershop_id,
          p_start_date: body.start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
          p_end_date: body.end_date || new Date().toISOString().split('T')[0]
        })

      if (statsError) {
        throw statsError
      }

      // Get additional metrics
      const { data: topServices } = await supabaseClient
        .from('appointments')
        .select('service_id, services(name), count')
        .eq('barbershop_id', body.barbershop_id)
        .eq('status', 'completed')
        .gte('start_time', body.start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('start_time', body.end_date || new Date().toISOString())
        .order('count', { ascending: false })
        .limit(5)

      const { data: topBarbers } = await supabaseClient
        .from('appointments')
        .select('barber_id, barbers(display_name), count')
        .eq('barbershop_id', body.barbershop_id)
        .eq('status', 'completed')
        .gte('start_time', body.start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('start_time', body.end_date || new Date().toISOString())
        .order('count', { ascending: false })
        .limit(5)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...stats[0],
            top_services: topServices,
            top_barbers: topBarbers
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get barber statistics
    if (method === 'POST' && path === 'barber-stats') {
      const body: GetBarberStatsRequest = await req.json()
      
      if (!body.barber_id) {
        throw new Error('Missing barber ID')
      }

      // Check if user is the barber or owner
      const { data: barber } = await supabaseClient
        .from('barbers')
        .select('profile_id, barbershop_id, barbershops(owner_id)')
        .eq('id', body.barber_id)
        .single()

      if (!barber || (barber.profile_id !== user.id && barber.barbershops.owner_id !== user.id)) {
        throw new Error('Unauthorized')
      }

      const startDate = body.start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
      const endDate = body.end_date || new Date().toISOString().split('T')[0]

      // Get barber-specific stats
      const { data: stats } = await supabaseClient
        .from('appointments')
        .select('*, payments(amount, tip_amount, status)')
        .eq('barber_id', body.barber_id)
        .gte('start_time', startDate)
        .lte('start_time', endDate)

      const totalAppointments = stats?.length || 0
      const completedAppointments = stats?.filter(a => a.status === 'completed').length || 0
      const cancelledAppointments = stats?.filter(a => a.status === 'cancelled').length || 0
      const noShowAppointments = stats?.filter(a => a.status === 'no_show').length || 0
      
      const revenue = stats?.reduce((sum, a) => {
        const payment = a.payments?.find(p => p.status === 'paid')
        return sum + (payment ? payment.amount + payment.tip_amount : 0)
      }, 0) || 0

      const tips = stats?.reduce((sum, a) => {
        const payment = a.payments?.find(p => p.status === 'paid')
        return sum + (payment?.tip_amount || 0)
      }, 0) || 0

      // Get service breakdown
      const serviceBreakdown = stats?.reduce((acc, appointment) => {
        const serviceId = appointment.service_id
        if (!acc[serviceId]) {
          acc[serviceId] = { count: 0, revenue: 0 }
        }
        acc[serviceId].count++
        const payment = appointment.payments?.find(p => p.status === 'paid')
        if (payment) {
          acc[serviceId].revenue += payment.amount
        }
        return acc
      }, {} as Record<string, { count: number, revenue: number }>) || {}

      // Get customer retention
      const uniqueCustomers = new Set(stats?.map(a => a.customer_id)).size
      const returningCustomers = stats?.reduce((acc, appointment) => {
        const customerId = appointment.customer_id
        const count = stats.filter(a => a.customer_id === customerId).length
        if (count > 1) {
          acc.add(customerId)
        }
        return acc
      }, new Set()).size || 0

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            total_appointments: totalAppointments,
            completed_appointments: completedAppointments,
            cancelled_appointments: cancelledAppointments,
            no_show_appointments: noShowAppointments,
            total_revenue: revenue,
            total_tips: tips,
            unique_customers: uniqueCustomers,
            returning_customers: returningCustomers,
            retention_rate: uniqueCustomers > 0 ? (returningCustomers / uniqueCustomers) * 100 : 0,
            service_breakdown: serviceBreakdown,
            average_ticket: completedAppointments > 0 ? revenue / completedAppointments : 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get revenue report
    if (method === 'POST' && path === 'revenue-report') {
      const body: GetRevenueReportRequest = await req.json()
      
      if (!body.barbershop_id || !body.start_date || !body.end_date) {
        throw new Error('Missing required fields')
      }

      // Check if user is owner
      const { data: barbershop } = await supabaseClient
        .from('barbershops')
        .select('owner_id')
        .eq('id', body.barbershop_id)
        .single()

      if (!barbershop || barbershop.owner_id !== user.id) {
        throw new Error('Unauthorized')
      }

      // Get revenue data
      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select(`
          start_time,
          barber_id,
          service_id,
          barbers(display_name),
          services(name),
          payments(amount, tip_amount, status)
        `)
        .eq('barbershop_id', body.barbershop_id)
        .eq('status', 'completed')
        .gte('start_time', body.start_date)
        .lte('start_time', body.end_date)
        .order('start_time')

      // Group by period
      const groupedData = appointments?.reduce((acc, appointment) => {
        const date = new Date(appointment.start_time)
        let key: string
        
        switch (body.group_by) {
          case 'day':
            key = date.toISOString().split('T')[0]
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default:
            key = date.toISOString().split('T')[0]
        }

        if (!acc[key]) {
          acc[key] = {
            period: key,
            revenue: 0,
            tips: 0,
            appointments: 0,
            services: {},
            barbers: {}
          }
        }

        const payment = appointment.payments?.find(p => p.status === 'paid')
        if (payment) {
          acc[key].revenue += payment.amount
          acc[key].tips += payment.tip_amount
        }
        acc[key].appointments++

        // Track by service
        const serviceName = appointment.services?.name || 'Unknown'
        if (!acc[key].services[serviceName]) {
          acc[key].services[serviceName] = { count: 0, revenue: 0 }
        }
        acc[key].services[serviceName].count++
        if (payment) {
          acc[key].services[serviceName].revenue += payment.amount
        }

        // Track by barber
        const barberName = appointment.barbers?.display_name || 'Unknown'
        if (!acc[key].barbers[barberName]) {
          acc[key].barbers[barberName] = { count: 0, revenue: 0, tips: 0 }
        }
        acc[key].barbers[barberName].count++
        if (payment) {
          acc[key].barbers[barberName].revenue += payment.amount
          acc[key].barbers[barberName].tips += payment.tip_amount
        }

        return acc
      }, {} as Record<string, any>) || {}

      const report = Object.values(groupedData).sort((a: any, b: any) => 
        a.period.localeCompare(b.period)
      )

      return new Response(
        JSON.stringify({ success: true, data: report }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Track event
    if (method === 'POST' && path === 'track') {
      const body = await req.json()
      
      if (!body.event_type) {
        throw new Error('Missing event type')
      }

      // Get user IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      const userAgent = req.headers.get('user-agent')

      // Create event
      const { error: eventError } = await supabaseClient
        .from('analytics_events')
        .insert({
          barbershop_id: body.barbershop_id,
          user_id: user.id,
          event_type: body.event_type,
          event_data: body.event_data || {},
          ip_address: ip,
          user_agent: userAgent
        })

      if (eventError) {
        throw eventError
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid endpoint')
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})