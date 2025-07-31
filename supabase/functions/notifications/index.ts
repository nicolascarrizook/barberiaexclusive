import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface SendNotificationRequest {
  recipient_id: string
  type: 'appointment_reminder' | 'appointment_confirmation' | 'appointment_cancellation' | 'appointment_rescheduled' | 'promotion' | 'general'
  channel: 'email' | 'sms' | 'push' | 'in_app'
  subject?: string
  content: string
  metadata?: Record<string, any>
  scheduled_for?: string
}

interface ProcessNotificationsRequest {
  limit?: number
}

// Email service configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@barbershop.com'

// SMS service configuration (Twilio)
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Send notification
    if (method === 'POST' && path === 'send') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('No authorization header')
      }

      const body: SendNotificationRequest = await req.json()
      
      // Validate required fields
      if (!body.recipient_id || !body.type || !body.channel || !body.content) {
        throw new Error('Missing required fields')
      }

      // Get recipient details
      const { data: recipient, error: recipientError } = await supabaseClient
        .from('profiles')
        .select('email, phone, full_name, notification_preferences')
        .eq('id', body.recipient_id)
        .single()

      if (recipientError || !recipient) {
        throw new Error('Recipient not found')
      }

      // Check notification preferences
      const preferences = recipient.notification_preferences as any
      if (!preferences[body.channel] || 
          (body.type === 'appointment_reminder' && !preferences.appointment_reminders) ||
          (body.type === 'promotion' && !preferences.promotions)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Notification preferences do not allow this type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create notification record
      const { data: notification, error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          recipient_id: body.recipient_id,
          type: body.type,
          channel: body.channel,
          subject: body.subject,
          content: body.content,
          metadata: body.metadata || {},
          scheduled_for: body.scheduled_for || new Date().toISOString()
        })
        .select()
        .single()

      if (notificationError) {
        throw notificationError
      }

      // If scheduled for future, don't send now
      if (body.scheduled_for && new Date(body.scheduled_for) > new Date()) {
        return new Response(
          JSON.stringify({ success: true, data: notification, scheduled: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send notification immediately
      const result = await sendNotification(notification, recipient, supabaseClient)

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process pending notifications (cron job)
    if (method === 'POST' && path === 'process') {
      // This should be called by a cron job with service role key
      const body: ProcessNotificationsRequest = await req.json()
      const limit = body.limit || 50

      // Get pending notifications
      const { data: notifications, error: fetchError } = await supabaseClient
        .from('notifications')
        .select(`
          *,
          recipient:profiles(email, phone, full_name, notification_preferences)
        `)
        .is('sent_at', null)
        .lte('scheduled_for', new Date().toISOString())
        .lt('retry_count', 3)
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      const results = []
      for (const notification of notifications || []) {
        try {
          const result = await sendNotification(notification, notification.recipient, supabaseClient)
          results.push({ id: notification.id, success: true, result })
        } catch (error) {
          results.push({ id: notification.id, success: false, error: error.message })
          
          // Update retry count
          await supabaseClient
            .from('notifications')
            .update({
              retry_count: notification.retry_count + 1,
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send appointment reminders
    if (method === 'POST' && path === 'reminders') {
      // Get appointments that need reminders (24 hours before)
      const reminderTime = new Date()
      reminderTime.setHours(reminderTime.getHours() + 24)

      const { data: appointments, error: appointmentsError } = await supabaseClient
        .from('appointments')
        .select(`
          *,
          customer:profiles(id, email, phone, full_name, notification_preferences),
          barber:barbers(display_name),
          service:services(name),
          barbershop:barbershops(name, address, phone)
        `)
        .eq('status', 'confirmed')
        .eq('reminder_sent', false)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', reminderTime.toISOString())
        .limit(50)

      if (appointmentsError) {
        throw appointmentsError
      }

      const results = []
      for (const appointment of appointments || []) {
        try {
          // Create reminder notification
          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
              recipient_id: appointment.customer_id,
              type: 'appointment_reminder',
              channel: 'email',
              subject: 'Recordatorio de tu turno',
              content: `Hola ${appointment.customer.full_name}, te recordamos que tienes un turno mañana a las ${new Date(appointment.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} con ${appointment.barber.display_name} en ${appointment.barbershop.name}.`,
              metadata: {
                appointment_id: appointment.id,
                confirmation_code: appointment.confirmation_code
              },
              scheduled_for: new Date().toISOString()
            })

          if (!notificationError) {
            // Mark reminder as sent
            await supabaseClient
              .from('appointments')
              .update({
                reminder_sent: true,
                reminder_sent_at: new Date().toISOString()
              })
              .eq('id', appointment.id)

            results.push({ appointment_id: appointment.id, success: true })
          }
        } catch (error) {
          results.push({ appointment_id: appointment.id, success: false, error: error.message })
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
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

// Helper function to send notifications
async function sendNotification(
  notification: any,
  recipient: any,
  supabaseClient: any
): Promise<any> {
  let result = null
  let error = null

  try {
    switch (notification.channel) {
      case 'email':
        result = await sendEmail(notification, recipient)
        break
      case 'sms':
        result = await sendSMS(notification, recipient)
        break
      case 'push':
        // Implement push notifications
        result = { message: 'Push notifications not implemented yet' }
        break
      case 'in_app':
        // In-app notifications are already created in the database
        result = { message: 'In-app notification created' }
        break
      default:
        throw new Error('Invalid notification channel')
    }
  } catch (err) {
    error = err.message
    throw err
  } finally {
    // Update notification record
    await supabaseClient
      .from('notifications')
      .update({
        sent_at: error ? null : new Date().toISOString(),
        delivered_at: error ? null : new Date().toISOString(),
        error_message: error,
        updated_at: new Date().toISOString()
      })
      .eq('id', notification.id)
  }

  return result
}

// Send email using Resend
async function sendEmail(notification: any, recipient: any): Promise<any> {
  if (!RESEND_API_KEY) {
    throw new Error('Email service not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: notification.subject || 'Notificación',
      html: notification.content,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Email send failed: ${error}`)
  }

  return await response.json()
}

// Send SMS using Twilio
async function sendSMS(notification: any, recipient: any): Promise<any> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('SMS service not configured')
  }

  if (!recipient.phone) {
    throw new Error('Recipient has no phone number')
  }

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: recipient.phone,
        Body: notification.content,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SMS send failed: ${error}`)
  }

  return await response.json()
}