import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  // For development, use a test account or SMTP settings
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASS || 'ethereal.pass'
      }
    });
  }

  // For production, use your actual SMTP settings
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmation - Phokela Guest House (Ref: ${booking.bookingReference || booking._id})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; font-weight: bold; font-size: 1.1em; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .status-badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.9em; font-weight: bold; }
          .room-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏡 Phokela Guest House</h1>
            <p>Your booking has been confirmed!</p>
            <div class="status-badge">CONFIRMED</div>
          </div>
          <div class="content">
            <h2>Dear ${booking.guestName},</h2>
            <p>Thank you for choosing Phokela Guest House for your stay. We're excited to welcome you to our beautiful property!</p>
            
            <div class="booking-details">
              <h3>📋 Booking Information</h3>
              <div class="detail-row">
                <span>Booking Reference:</span>
                <span><strong>${booking.bookingReference || booking._id}</strong></span>
              </div>
              <div class="detail-row">
                <span>Booking ID:</span>
                <span>${booking._id}</span>
              </div>
              <div class="detail-row">
                <span>Status:</span>
                <span class="status-badge">CONFIRMED</span>
              </div>
              <div class="detail-row">
                <span>Payment Status:</span>
                <span class="status-badge">PAID</span>
              </div>
            </div>

            <div class="room-info">
              <h3>🏨 Room Details</h3>
              <div class="detail-row">
                <span>Room Type:</span>
                <span><strong>${booking.room?.name || booking.roomTypeName || 'N/A'}</strong></span>
              </div>
              ${booking.roomUnit ? `
                <div class="detail-row">
                  <span>Room Unit:</span>
                  <span><strong>${booking.roomUnit.unitName || booking.roomUnitNumber || 'N/A'}</strong></span>
                </div>
              ` : ''}
              <div class="detail-row">
                <span>Max Guests:</span>
                <span>${booking.room?.maxGuests || 'N/A'}</span>
              </div>
            </div>
            
            <div class="booking-details">
              <h3>📅 Stay Details</h3>
              <div class="detail-row">
                <span>Check-in Date:</span>
                <span><strong>${new Date(booking.checkinDate).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
              </div>
              <div class="detail-row">
                <span>Check-out Date:</span>
                <span><strong>${new Date(booking.checkoutDate).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
              </div>
              <div class="detail-row">
                <span>Number of Guests:</span>
                <span><strong>${booking.numberOfGuests}</strong></span>
              </div>
              <div class="detail-row">
                <span>Total Amount:</span>
                <span><strong>R ${parseFloat(booking.totalAmount).toFixed(2)}</strong></span>
              </div>
            </div>

            ${booking.specialRequests ? `
              <div class="booking-details">
                <h3>📝 Special Requests</h3>
                <p>${booking.specialRequests}</p>
              </div>
            ` : ''}

            <div class="booking-details">
              <h3>ℹ️ Important Information</h3>
              <ul>
                <li>Check-in time: 14:00 (2:00 PM)</li>
                <li>Check-out time: 11:00 (11:00 AM)</li>
                <li>Please bring a valid ID for check-in</li>
                <li>Free parking is available on-site</li>
                <li>WiFi is complimentary throughout the property</li>
              </ul>
            </div>

            <p>We look forward to providing you with an exceptional stay. If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <div class="footer">
              <p><strong>Contact Information:</strong></p>
              <p>📞 +27 15 123 4567 | 📧 info@phokelaguest.co.za</p>
              <p>📍 123 Mokopane Road, Polokwane, Limpopo 0700, South Africa</p>
              <p>Thank you for choosing Phokela Guest House!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  bookingCancellation: (booking) => ({
    subject: `Booking Cancelled - Phokela Guest House`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏡 Phokela Guest House</h1>
            <p>Booking Cancelled</p>
          </div>
          <div class="content">
            <h2>Dear ${booking.guestName},</h2>
            <p>We're sorry to inform you that your booking has been cancelled.</p>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p>If you have any questions about this cancellation or would like to make a new booking, please contact us.</p>
            <div class="footer">
              <p><strong>Contact Information:</strong></p>
              <p>📞 +27 12 345 6789 | 📧 info@phokelaguesthouse.co.za</p>
              <p>📍 123 Mountain View Road, Phokela, South Africa</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
export const sendEmail = async (to, template, data) => {
  try {
    const emailTemplate = emailTemplates[template](data);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@phokelaguesthouse.co.za',
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send booking confirmation email
export const sendBookingConfirmation = async (booking) => {
  return await sendEmail(booking.guestEmail, 'bookingConfirmation', booking);
};

// Send booking cancellation email
export const sendBookingCancellation = async (booking) => {
  return await sendEmail(booking.guestEmail, 'bookingCancellation', booking);
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};
