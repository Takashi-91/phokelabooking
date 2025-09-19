// Test email functionality
import { sendBookingConfirmation, testEmailConfig } from './src/services/email.js';

async function testEmail() {
    console.log('Testing email configuration...');
    
    // Test email config
    const configValid = await testEmailConfig();
    if (!configValid) {
        console.error('❌ Email configuration is invalid');
        return;
    }
    
    console.log('✅ Email configuration is valid');
    
    // Test booking confirmation email
    const testBooking = {
        _id: 'test-booking-123',
        bookingReference: 'PHK-25-TEST123',
        guestName: 'John Doe',
        guestEmail: 'test@example.com',
        checkinDate: new Date('2024-02-15'),
        checkoutDate: new Date('2024-02-17'),
        numberOfGuests: 2,
        totalAmount: '1700.00',
        specialRequests: 'Late check-in requested',
        room: {
            name: 'Deluxe Suite',
            maxGuests: 4
        },
        roomUnit: {
            unitName: 'Deluxe Suite #201',
            unitNumber: '201'
        }
    };
    
    console.log('Sending test booking confirmation email...');
    const result = await sendBookingConfirmation(testBooking);
    
    if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', result.messageId);
    } else {
        console.error('❌ Failed to send test email:', result.error);
    }
}

testEmail().catch(console.error);
