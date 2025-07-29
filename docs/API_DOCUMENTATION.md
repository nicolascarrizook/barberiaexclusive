# API Documentation - Barbershop Booking System

## Base URL
```
https://[YOUR_PROJECT_REF].supabase.co/functions/v1
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer [JWT_TOKEN]
```

## Endpoints

### Appointments

#### Create Appointment
```http
POST /appointments/create
```

**Request Body:**
```json
{
  "barbershop_id": "uuid",
  "barber_id": "uuid",
  "service_id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "notes": "string (optional)",
  "promotion_code": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "confirmation_code": "ABC123",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T10:30:00Z",
    "price": 2500.00,
    "status": "pending"
  }
}
```

#### Update Appointment
```http
PATCH /appointments/update
```

**Request Body:**
```json
{
  "appointment_id": "uuid",
  "status": "confirmed | cancelled | completed | no_show",
  "start_time": "2024-01-15T11:00:00Z (optional)",
  "end_time": "2024-01-15T11:30:00Z (optional)",
  "notes": "string (optional)",
  "internal_notes": "string (optional - barber/owner only)",
  "cancellation_reason": "string (optional)"
}
```

#### Find Alternative Slots
```http
POST /appointments/alternatives
```

**Request Body:**
```json
{
  "barber_id": "uuid",
  "requested_time": "2024-01-15T10:00:00Z",
  "service_duration": 30,
  "date_flexibility": 3,
  "max_suggestions": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slot_start": "2024-01-15T11:00:00Z",
      "slot_end": "2024-01-15T11:30:00Z",
      "date_diff": 0,
      "time_diff": 60
    }
  ]
}
```

#### Get Available Slots
```http
GET /appointments/slots?barber_id=uuid&date=2024-01-15&service_duration=30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slot_start": "2024-01-15T09:00:00Z",
      "slot_end": "2024-01-15T09:30:00Z"
    },
    {
      "slot_start": "2024-01-15T09:30:00Z",
      "slot_end": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### List Appointments
```http
GET /appointments/list?customer_id=uuid&status=confirmed&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters:**
- `customer_id` (optional)
- `barber_id` (optional)
- `barbershop_id` (optional)
- `status` (optional)
- `start_date` (optional)
- `end_date` (optional)

### Notifications

#### Send Notification
```http
POST /notifications/send
```

**Request Body:**
```json
{
  "recipient_id": "uuid",
  "type": "appointment_reminder | appointment_confirmation | appointment_cancellation | appointment_rescheduled | promotion | general",
  "channel": "email | sms | push | in_app",
  "subject": "string (optional)",
  "content": "string",
  "metadata": {},
  "scheduled_for": "2024-01-15T10:00:00Z (optional)"
}
```

#### Process Notifications (Service Role Only)
```http
POST /notifications/process
```

**Request Body:**
```json
{
  "limit": 50
}
```

#### Send Appointment Reminders (Service Role Only)
```http
POST /notifications/reminders
```

### Analytics

#### Get Barbershop Statistics
```http
POST /analytics/barbershop-stats
```

**Request Body:**
```json
{
  "barbershop_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_appointments": 150,
    "completed_appointments": 120,
    "cancelled_appointments": 20,
    "no_show_appointments": 10,
    "total_revenue": 425000.00,
    "average_rating": 4.5,
    "total_customers": 80,
    "new_customers": 30,
    "returning_customers": 50,
    "top_services": [],
    "top_barbers": []
  }
}
```

#### Get Barber Statistics
```http
POST /analytics/barber-stats
```

**Request Body:**
```json
{
  "barber_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

#### Get Revenue Report
```http
POST /analytics/revenue-report
```

**Request Body:**
```json
{
  "barbershop_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "group_by": "day | week | month"
}
```

#### Track Event
```http
POST /analytics/track
```

**Request Body:**
```json
{
  "barbershop_id": "uuid (optional)",
  "event_type": "string",
  "event_data": {}
}
```

## Error Responses

All endpoints return errors in the following format:
```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- Edge Functions: 1000 requests per hour per IP
- Database queries: Based on Supabase plan

## Webhooks

Configure webhooks in Supabase Dashboard for real-time events:
- `appointment.created`
- `appointment.updated`
- `appointment.cancelled`
- `payment.completed`
- `review.created`