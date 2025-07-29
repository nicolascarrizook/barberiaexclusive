import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateAppointmentRequest {
  barbershop_id: string
  barber_id: string
  service_id: string
  start_time: string
  notes?: string
  promotion_code?: string
}

interface UpdateAppointmentRequest {
  appointment_id: string
  status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  start_time?: string
  end_time?: string
  notes?: string
  internal_notes?: string
  cancellation_reason?: string
}

interface FindAlternativeSlotsRequest {
  barber_id: string
  requested_time: string
  service_duration: number
  date_flexibility?: number
  max_suggestions?: number
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

    // Create appointment
    if (method === 'POST' && path === 'create') {
      const body: CreateAppointmentRequest = await req.json()
      
      // Validate required fields
      if (!body.barbershop_id || !body.barber_id || !body.service_id || !body.start_time) {
        throw new Error('Missing required fields')
      }

      // Get service details
      const { data: service, error: serviceError } = await supabaseClient
        .from('services')
        .select('duration_minutes')
        .eq('id', body.service_id)
        .single()

      if (serviceError || !service) {
        throw new Error('Service not found')
      }

      // Calculate end time
      const startTime = new Date(body.start_time)
      const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)

      // Calculate price
      const { data: pricing } = await supabaseClient
        .rpc('calculate_appointment_price', {
          p_service_id: body.service_id,
          p_barber_id: body.barber_id,
          p_promotion_code: body.promotion_code
        })

      if (!pricing || pricing.length === 0) {
        throw new Error('Could not calculate price')
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabaseClient
        .from('appointments')
        .insert({
          barbershop_id: body.barbershop_id,
          barber_id: body.barber_id,
          customer_id: user.id,
          service_id: body.service_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price: pricing[0].final_price,
          notes: body.notes,
          status: 'pending',
          metadata: body.promotion_code ? { promotion_id: pricing[0].promotion_id } : {}
        })
        .select()
        .single()

      if (appointmentError) {
        throw appointmentError
      }

      // Create payment record
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          amount: pricing[0].final_price,
          status: 'pending'
        })

      if (paymentError) {
        throw paymentError
      }

      return new Response(
        JSON.stringify({ success: true, data: appointment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update appointment
    if (method === 'PATCH' && path === 'update') {
      const body: UpdateAppointmentRequest = await req.json()
      
      if (!body.appointment_id) {
        throw new Error('Missing appointment ID')
      }

      // Check if user has permission to update
      const { data: appointment, error: fetchError } = await supabaseClient
        .from('appointments')
        .select('*, barbers!inner(profile_id)')
        .eq('id', body.appointment_id)
        .single()

      if (fetchError || !appointment) {
        throw new Error('Appointment not found')
      }

      // Check permissions
      const isCustomer = appointment.customer_id === user.id
      const isBarber = appointment.barbers.profile_id === user.id
      const { data: isOwner } = await supabaseClient
        .from('barbershops')
        .select('id')
        .eq('id', appointment.barbershop_id)
        .eq('owner_id', user.id)
        .single()

      if (!isCustomer && !isBarber && !isOwner) {
        throw new Error('Unauthorized')
      }

      // Build update object
      const updates: any = {}
      
      if (body.status) {
        updates.status = body.status
        if (body.status === 'cancelled') {
          updates.cancelled_by = user.id
          updates.cancellation_reason = body.cancellation_reason
        }
      }

      if (body.start_time && body.end_time) {
        updates.start_time = body.start_time
        updates.end_time = body.end_time
      }

      if (body.notes !== undefined) {
        updates.notes = body.notes
      }

      if (body.internal_notes !== undefined && (isBarber || isOwner)) {
        updates.internal_notes = body.internal_notes
      }

      // Update appointment
      const { data: updatedAppointment, error: updateError } = await supabaseClient
        .from('appointments')
        .update(updates)
        .eq('id', body.appointment_id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ success: true, data: updatedAppointment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find alternative slots
    if (method === 'POST' && path === 'alternatives') {
      const body: FindAlternativeSlotsRequest = await req.json()
      
      if (!body.barber_id || !body.requested_time || !body.service_duration) {
        throw new Error('Missing required fields')
      }

      const { data: alternatives, error: alternativesError } = await supabaseClient
        .rpc('suggest_alternative_slots', {
          p_barber_id: body.barber_id,
          p_requested_time: body.requested_time,
          p_service_duration: body.service_duration,
          p_date_flexibility: body.date_flexibility || 3,
          p_max_suggestions: body.max_suggestions || 5
        })

      if (alternativesError) {
        throw alternativesError
      }

      return new Response(
        JSON.stringify({ success: true, data: alternatives }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get available slots
    if (method === 'GET' && path === 'slots') {
      const barberId = url.searchParams.get('barber_id')
      const date = url.searchParams.get('date')
      const serviceDuration = url.searchParams.get('service_duration')

      if (!barberId || !date || !serviceDuration) {
        throw new Error('Missing required parameters')
      }

      const { data: slots, error: slotsError } = await supabaseClient
        .rpc('get_available_slots', {
          p_barber_id: barberId,
          p_date: date,
          p_service_duration: parseInt(serviceDuration),
          p_buffer_time: 0
        })

      if (slotsError) {
        throw slotsError
      }

      return new Response(
        JSON.stringify({ success: true, data: slots }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get appointments
    if (method === 'GET' && path === 'list') {
      const customerId = url.searchParams.get('customer_id')
      const barberId = url.searchParams.get('barber_id')
      const barbershopId = url.searchParams.get('barbershop_id')
      const status = url.searchParams.get('status')
      const startDate = url.searchParams.get('start_date')
      const endDate = url.searchParams.get('end_date')

      let query = supabaseClient
        .from('appointments')
        .select(`
          *,
          barbers (
            id,
            display_name,
            profile:profiles(full_name, avatar_url)
          ),
          services (id, name, duration_minutes, price),
          barbershops (id, name, address, phone),
          payments (id, status, amount, tip_amount)
        `)

      // Apply filters
      if (customerId) {
        query = query.eq('customer_id', customerId)
      }
      if (barberId) {
        query = query.eq('barber_id', barberId)
      }
      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId)
      }
      if (status) {
        query = query.eq('status', status)
      }
      if (startDate) {
        query = query.gte('start_time', startDate)
      }
      if (endDate) {
        query = query.lte('start_time', endDate)
      }

      // Order by start time
      query = query.order('start_time', { ascending: false })

      const { data: appointments, error: listError } = await query

      if (listError) {
        throw listError
      }

      return new Response(
        JSON.stringify({ success: true, data: appointments }),
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