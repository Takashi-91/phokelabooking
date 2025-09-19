# Booking Flow Implementation

## Overview
This document describes the complete booking flow implementation for Phokela Guest House, including automatic booking confirmation and email notifications after successful payment.

## Flow Diagram

```
Customer → Select Room → Choose Dates → Guest Info → Payment → Verification → Confirmation Email
    ↓           ↓            ↓           ↓          ↓           ↓              ↓
  Frontend   Frontend    Frontend   Frontend   Paystack   Backend API    Email Service
```

## Implementation Details

### 1. Frontend Booking Process

#### Step 1: Room Selection
- Customer selects a room type from available options
- System displays room details, amenities, and pricing
- Room availability is checked in real-time

#### Step 2: Date Selection
- Customer selects check-in and check-out dates
- System validates date ranges and minimum stay requirements
- Availability is checked for the selected dates

#### Step 3: Guest Information
- Customer provides personal details (name, email, phone)
- Guest preferences can be specified (floor, view, accessibility)
- Special requests can be added

#### Step 4: Payment Processing
- System creates a booking with "pending" status
- Paystack payment is initialized with booking reference
- Customer is redirected to Paystack payment page

### 2. Payment Verification

#### Automatic Verification
When customer returns from Paystack, the system:

1. **Extracts payment reference** from URL parameters
2. **Verifies payment** with Paystack API
3. **Updates booking status** to "confirmed" and "paid"
4. **Sends confirmation email** to customer
5. **Logs the transaction** for audit purposes

#### URL Parameters Handled
- `?payment=callback&reference=PHK-25-7DLNZO` - Paystack callback
- `?trxref=PHK-25-7DLNZO` - Direct Paystack return

### 3. Backend API Endpoints

#### Payment Verification
```
POST /api/payments/verify
{
  "reference": "PHK-25-7DLNZO"
}
```

**Response:**
```json
{
  "status": "success",
  "paid": true,
  "amount": 1700.00,
  "currency": "ZAR",
  "reference": "PHK-25-7DLNZO",
  "bookingConfirmed": true
}
```

#### Webhook Handler
```
POST /api/payments/webhook
```
Handles Paystack webhook events for additional reliability.

### 4. Email Notifications

#### Confirmation Email Features
- **Professional HTML template** with Phokela branding
- **Complete booking details** including room, dates, and pricing
- **Booking reference number** for easy tracking
- **Important information** about check-in/out times
- **Contact details** for support

#### Email Template Sections
1. **Header** - Phokela Guest House branding
2. **Booking Information** - Reference, status, payment status
3. **Room Details** - Room type, unit number, max guests
4. **Stay Details** - Check-in/out dates, number of guests, total amount
5. **Special Requests** - If any were provided
6. **Important Information** - Check-in times, policies, amenities
7. **Contact Information** - Phone, email, address

### 5. Database Updates

#### Booking Status Flow
```
pending → confirmed (after payment)
```

#### Payment Status Flow
```
pending → paid (after successful payment)
```

#### Fields Updated on Payment Success
- `status`: "confirmed"
- `paymentStatus`: "paid"
- `paymentId`: Paystack transaction ID
- `paymentMethod`: "paystack"
- `paidAt`: Timestamp of payment

### 6. Error Handling

#### Payment Verification Failures
- **Network errors**: Retry mechanism with exponential backoff
- **Invalid reference**: Clear error message to customer
- **Payment failed**: Inform customer to contact support
- **Email failures**: Log error but don't fail booking confirmation

#### User Feedback
- **Success**: "🎉 Payment successful! Your booking has been confirmed and a confirmation email has been sent to your email address."
- **Failure**: "Payment verification failed. Please contact support if you were charged."
- **Processing**: Loading indicators during verification

### 7. Admin Panel Integration

#### Booking Management
- **Real-time updates** when bookings are confirmed
- **Payment status tracking** for all bookings
- **Email delivery status** logging
- **Booking reference lookup** for customer support

#### New Endpoints
- `GET /api/bookings/reference/:reference` - Lookup booking by reference
- Enhanced booking details with payment information

### 8. Testing

#### Email Testing
Run the test script to verify email functionality:
```bash
node test-email.js
```

#### Payment Testing
1. Use Paystack test mode for development
2. Test with various payment scenarios (success, failure, cancellation)
3. Verify webhook handling
4. Test email delivery

### 9. Environment Variables

#### Required for Email
```env
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@phokelaguest.co.za
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

#### Required for Paystack
```env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

### 10. Monitoring and Logging

#### Success Logs
- `✅ Booking {id} confirmed and confirmation email sent to {email}`
- `✅ Webhook: Booking {id} confirmed and email sent to {email}`

#### Error Logs
- `❌ Failed to send confirmation email: {error}`
- `❌ Webhook: Failed to send confirmation email: {error}`

#### Audit Trail
- All payment verifications are logged
- Email delivery attempts are tracked
- Booking status changes are recorded

## Security Considerations

1. **Payment Verification**: Always verify with Paystack API, never trust client-side data
2. **Email Validation**: Validate email addresses before sending
3. **Rate Limiting**: Implement rate limiting on payment verification endpoint
4. **Logging**: Log all payment-related activities for audit purposes

## Future Enhancements

1. **SMS Notifications**: Add SMS confirmation alongside email
2. **Booking Modifications**: Allow customers to modify bookings
3. **Cancellation Policy**: Implement automated cancellation handling
4. **Multi-language Support**: Support multiple languages in emails
5. **Analytics**: Track booking conversion rates and payment success rates
