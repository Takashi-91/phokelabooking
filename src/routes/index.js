import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import User from '../models/User.js';
import Room from '../models/Room.js';
import RoomType from '../models/RoomType.js';
import RoomUnit from '../models/RoomUnit.js';
import Booking from '../models/Booking.js';
import ContactMessage from '../models/ContactMessage.js';
import Admin from '../models/Admin.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { 
  initializePaystackTransaction, 
  verifyPaystackTransaction, 
  generatePaystackReference,
  getPaystackPublicKey,
  isPaystackConfigured 
} from '../services/paystack.js';
import { sendBookingConfirmation, sendBookingCancellation } from '../services/email.js';

const router = Router();

// Helper functions for room unit selection and pricing
function selectRoomUnit(availableUnits, guestPreferences = {}) {
  if (!availableUnits || availableUnits.length === 0) return null;
  
  // If no preferences, return first available unit
  if (!guestPreferences) return availableUnits[0];
  
  // Filter by floor preference
  if (guestPreferences.floor) {
    const floorUnits = availableUnits.filter(unit => 
      unit.floor && unit.floor.toString() === guestPreferences.floor
    );
    if (floorUnits.length > 0) return floorUnits[0];
  }
  
  // Filter by view preference
  if (guestPreferences.view) {
    const viewUnits = availableUnits.filter(unit => 
      unit.specialFeatures && unit.specialFeatures.includes(guestPreferences.view)
    );
    if (viewUnits.length > 0) return viewUnits[0];
  }
  
  // Filter by accessibility preference
  if (guestPreferences.accessibility) {
    const accessibleUnits = availableUnits.filter(unit => 
      unit.specialFeatures && unit.specialFeatures.includes('accessible')
    );
    if (accessibleUnits.length > 0) return accessibleUnits[0];
  }
  
  // Return first available unit
  return availableUnits[0];
}

function getSeasonalPricingMultiplier(roomType, checkinDate) {
  if (!roomType.seasonalPricing || roomType.seasonalPricing.length === 0) {
    return 1.0;
  }
  
  const activePricing = roomType.seasonalPricing.find(pricing => 
    pricing.isActive && 
    checkinDate >= new Date(pricing.startDate) && 
    checkinDate <= new Date(pricing.endDate)
  );
  
  return activePricing ? activePricing.priceMultiplier : 1.0;
}

function generateBookingReference() {
  const prefix = 'PHK';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

const insertRoomSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  maxGuests: z.number().int().positive(),
  amenities: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional()
});

const insertBookingSchema = z.object({
  userId: z.string().optional(),
  roomTypeId: z.string().min(1), // Changed from roomId to roomTypeId
  roomUnitId: z.string().optional(), // Optional - will be assigned automatically
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(3),
  checkinDate: z.string(),
  checkoutDate: z.string(),
  numberOfGuests: z.number().int().positive(),
  specialRequests: z.string().optional(),
  guestPreferences: z.object({
    smoking: z.boolean().default(false),
    accessibility: z.boolean().default(false),
    floor: z.string().optional(),
    view: z.string().optional()
  }).optional()
});

const insertContactMessageSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(1)
});

const insertAdminSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().default('admin')
});

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

router.get('/auth/user', isAuthenticated, async (req, res) => {
  const sub = req.user.sub;
  const user = await User.findOne({ id: sub });
  res.json(user || { id: sub });
});

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = adminLoginSchema.parse(req.body);
    const admin = await Admin.findOne({ username, isActive: true });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    admin.lastLogin = new Date();
    await admin.save();
    req.session.adminUser = { id: admin._id.toString(), username: admin.username, email: admin.email, role: admin.role };
    res.json({ message: 'Login successful', admin: req.session.adminUser });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Login failed' }); }
});

router.get('/admin/me', (req, res) => {
  if (!req.session?.adminUser) return res.status(401).json({ message: 'Not authenticated' });
  res.json(req.session.adminUser);
});

router.post('/admin/logout', (req, res) => { req.session.adminUser = null; res.json({ message: 'Logout successful' }); });

router.post('/admin/create', async (req, res) => {
  try {
    const data = insertAdminSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const admin = await Admin.create({ ...data, passwordHash });
    const { passwordHash: _ph, ...rest } = admin.toObject();
    res.status(201).json(rest);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create admin' }); }
});

// Legacy room routes for backward compatibility
router.get('/rooms', async (_req, res) => {
  try { 
    // Redirect to room types for backward compatibility
    const roomTypes = await RoomType.find({ isActive: true });
    res.json(roomTypes); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch rooms' }); }
});

router.get('/rooms/:id', async (req, res) => {
  try { 
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) return res.status(404).json({ message: 'Room not found' });
    res.json(roomType); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch room' }); }
});

// Admin room management routes (legacy - redirect to room types)
router.post('/admin/rooms', requireAdmin, async (req, res) => {
  try { 
    // Redirect to room type creation
    const data = insertRoomSchema.parse(req.body);
    const roomType = new RoomType({
      name: data.name,
      type: data.type,
      description: data.description,
      price: data.price,
      maxGuests: data.maxGuests,
      amenities: data.amenities || [],
      images: data.imageUrl ? [data.imageUrl] : [],
      isActive: data.isAvailable !== false,
      totalUnits: 1,
      availableUnits: data.isAvailable !== false ? 1 : 0
    });
    await roomType.save();
    
    // Create a room unit for this room type
    const roomUnit = new RoomUnit({
      roomTypeId: roomType._id,
      unitNumber: '001',
      unitName: `${roomType.name} #001`,
      isAvailable: data.isAvailable !== false,
      status: 'available'
    });
    await roomUnit.save();
    
    res.status(201).json(roomType); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create room' }); }
});

router.put('/admin/rooms/:id', requireAdmin, async (req, res) => {
  try { 
    const data = insertRoomSchema.partial().parse(req.body); 
    const roomType = await RoomType.findByIdAndUpdate(req.params.id, {
      name: data.name,
      type: data.type,
      description: data.description,
      price: data.price,
      maxGuests: data.maxGuests,
      amenities: data.amenities,
      images: data.imageUrl ? [data.imageUrl] : [],
      isActive: data.isAvailable !== false
    }, { new: true }); 
    res.json(roomType); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update room' }); }
});

router.delete('/admin/rooms/:id', requireAdmin, async (req, res) => {
  try { 
    // Delete room type and all associated units
    await RoomUnit.deleteMany({ roomTypeId: req.params.id });
    await RoomType.findByIdAndDelete(req.params.id); 
    res.json({ message: 'Room deleted successfully' }); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to delete room' }); }
});

router.patch('/admin/rooms/:id/availability', requireAdmin, async (req, res) => {
  try { 
    const { isAvailable } = req.body; 
    const roomType = await RoomType.findByIdAndUpdate(req.params.id, { isActive: isAvailable }, { new: true }); 
    res.json(roomType); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update room availability' }); }
});

router.post('/rooms/:id/check-availability', async (req, res) => {
  try {
    const { checkinDate, checkoutDate } = req.body;
    if (!checkinDate || !checkoutDate) return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    
    // Use room type availability checking
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // Check if room type is active
    if (!roomType.isActive) {
      return res.json({ available: false, reason: 'Room type is not available' });
    }
    
    // Check for booking conflicts
    const conflict = await Booking.exists({ 
      roomTypeId: req.params.id, 
      status: { $ne: 'cancelled' }, 
      $or: [{ checkinDate: { $lte: checkout }, checkoutDate: { $gte: checkin } }] 
    });
    
    res.json({ available: !conflict });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to check availability' }); }
});

router.get('/bookings', isAuthenticated, async (req, res) => {
  try {
    const sub = req.user.sub;
    const me = await User.findOne({ id: sub });
    const isAdmin = !!me?.isAdmin;
    const query = isAdmin ? {} : { userId: sub };
    const bookings = await Booking.find(query).sort({ createdAt: -1 })
      .populate('roomUnitId', 'unitNumber unitName floor status')
      .populate('roomTypeId', 'name type price maxGuests amenities');
    const results = bookings.map(b => ({ 
      ...b.toObject(), 
      room: b.roomTypeId, 
      roomUnit: b.roomUnitId,
      roomId: b.roomTypeId?._id?.toString(), // For backward compatibility
      roomUnitId: b.roomUnitId?._id?.toString()
    }));
    res.json(results);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch bookings' }); }
});

router.post('/bookings', async (req, res) => {
  try {
    const data = insertBookingSchema.parse(req.body);
    const checkinDate = new Date(data.checkinDate);
    const checkoutDate = new Date(data.checkoutDate);
    const room = await Room.findById(data.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const overlap = await Booking.exists({ roomId: data.roomId, status: { $ne: 'cancelled' }, $or: [{ checkinDate: { $lte: checkoutDate }, checkoutDate: { $gte: checkinDate } }] });
    if (overlap) return res.status(400).json({ message: 'Room is not available for the selected dates' });
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000*60*60*24));
    const totalAmount = (parseFloat(room.price) * nights).toFixed(2);
    const booking = await Booking.create({ ...data, checkinDate, checkoutDate, totalAmount });
    res.status(201).json(booking);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create booking' }); }
});

router.get('/admin/bookings', requireAdmin, async (_req, res) => {
  try { 
    const bookings = await Booking.find().sort({ createdAt: -1 })
      .populate('roomUnitId', 'unitNumber unitName floor status')
      .populate('roomTypeId', 'name type price maxGuests amenities');
    const results = bookings.map(b => ({ 
      ...b.toObject(), 
      room: b.roomTypeId, 
      roomUnit: b.roomUnitId,
      roomId: b.roomTypeId?._id?.toString(), // For backward compatibility
      roomUnitId: b.roomUnitId?._id?.toString()
    })); 
    res.json(results); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch bookings' }); }
});

// Get booking by reference (for admin and customer lookup)
router.get('/bookings/reference/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const booking = await Booking.findOne({ bookingReference: reference })
      .populate('roomUnitId', 'unitNumber unitName floor status')
      .populate('roomTypeId', 'name type price maxGuests amenities');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const result = { 
      ...booking.toObject(), 
      room: booking.roomTypeId, 
      roomUnit: booking.roomUnitId,
      roomId: booking.roomTypeId?._id?.toString(),
      roomUnitId: booking.roomUnitId?._id?.toString()
    };
    
    res.json(result);
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ message: 'Failed to fetch booking' }); 
  }
});

router.patch('/admin/bookings/:id', requireAdmin, async (req, res) => {
  try { 
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('roomUnitId', 'unitNumber unitName floor status')
      .populate('roomTypeId', 'name type price maxGuests amenities'); 
    
    // Send email notifications based on status change
    if (req.body.status === 'cancelled') {
      const bookingWithRoom = { ...updated.toObject(), room: updated.roomTypeId, roomUnit: updated.roomUnitId };
      await sendBookingCancellation(bookingWithRoom);
    } else if (req.body.status === 'confirmed' && updated.paymentStatus === 'paid') {
      const bookingWithRoom = { ...updated.toObject(), room: updated.roomTypeId, roomUnit: updated.roomUnitId };
      await sendBookingConfirmation(bookingWithRoom);
    }
    
    res.json(updated); 
  }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update booking' }); }
});

router.get('/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthly = await Booking.find({ createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } });
    const monthlyRevenue = monthly.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalRoomTypes = await RoomType.countDocuments();
    const totalRoomUnits = await RoomUnit.countDocuments();
    const activeBookings = await Booking.countDocuments({ checkinDate: { $lte: now }, checkoutDate: { $gte: now }, status: { $ne: 'cancelled' } });
    const occupancyRate = totalRoomUnits > 0 ? (activeBookings / totalRoomUnits) * 100 : 0;
    res.json({ totalBookings, monthlyRevenue, occupancyRate, totalRoomTypes, totalRoomUnits });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch stats' }); }
});

router.post('/contact', async (req, res) => {
  try { const data = insertContactMessageSchema.parse(req.body); const message = await ContactMessage.create(data); res.status(201).json(message); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to send message' }); }
});

// Test email endpoint (for development/testing)
router.post('/test-email', async (req, res) => {
  try {
    const testBooking = {
      _id: 'test-booking-123',
      bookingReference: 'PHK-25-TEST123',
      guestName: 'Test User',
      guestEmail: 'test@example.com',
      checkinDate: new Date('2024-02-15'),
      checkoutDate: new Date('2024-02-17'),
      numberOfGuests: 2,
      totalAmount: '1700.00',
      specialRequests: 'Test booking for email verification',
      room: {
        name: 'Deluxe Suite',
        maxGuests: 4
      },
      roomUnit: {
        unitName: 'Deluxe Suite #201',
        unitNumber: '201'
      }
    };
    
    const result = await sendBookingConfirmation(testBooking);
    
    if (result.success) {
      res.json({ message: 'Test email sent successfully!', messageId: result.messageId });
    } else {
      res.status(500).json({ message: 'Failed to send test email', error: result.error });
    }
  } catch (e) {
    console.error('Test email error:', e);
    res.status(500).json({ message: 'Test email failed', error: e.message });
  }
});

router.get('/admin/contact', requireAdmin, async (_req, res) => {
  try { const messages = await ContactMessage.find().sort({ createdAt: -1 }); res.json(messages); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch messages' }); }
});

router.patch('/admin/contact/:id/read', requireAdmin, async (req, res) => {
  try { await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true }); res.json({ message: 'Message marked as read' }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to mark message as read' }); }
});

router.post('/admin/init-rooms', requireAdmin, async (_req, res) => {
  try {
    const count = await Room.countDocuments();
    if (count > 0) return res.json({ message: 'Rooms already exist' });
    const defaults = [
      { name: 'Standard Double Room', type: 'standard-double', description: 'Comfortable room with queen bed, private bathroom, and garden view', price: '850.00', maxGuests: 2, amenities: ['Queen Bed','Private Bath','Garden View','Free WiFi'], imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&h=600' },
      { name: 'Deluxe Suite', type: 'deluxe-suite', description: 'Spacious suite with king bed, sitting area, and stunning mountain views', price: '1250.00', maxGuests: 4, amenities: ['King Bed','Mountain View','Sitting Area','Free WiFi'], imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&h=600' },
      { name: 'Family Room', type: 'family-room', description: "Perfect for families with double bed and bunk beds, plus kids' play area", price: '1450.00', maxGuests: 6, amenities: ['Multiple Beds','Play Area','Family Friendly','Free WiFi'], imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&h=600' },
      { name: 'Executive Suite', type: 'executive-suite', description: 'Ultimate luxury with private balcony, jacuzzi, and panoramic views', price: '2100.00', maxGuests: 2, amenities: ['Jacuzzi','Balcony','Luxury Amenities','Panoramic View'], imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&h=600' }
    ];
    const created = await Room.insertMany(defaults);
    res.json({ message: 'Default rooms created', rooms: created });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create default rooms' }); }
});

router.get('/payments/config', async (req, res) => {
  try {
    res.json({ 
      publicKey: getPaystackPublicKey(),
      configured: isPaystackConfigured()
    });
  } catch (e) { 
    console.error('Payment config error', e); 
    res.status(500).json({ message: 'Failed to get payment config', error: e.message }); 
  }
});

router.post('/payments/create-checkout', async (req, res) => {
  try {
    const { amount, currency = 'ZAR', metadata = {} } = req.body;
    if (!isPaystackConfigured()) return res.status(500).json({ message: 'Payment service not configured' });
    
    const reference = generatePaystackReference();
    const result = await initializePaystackTransaction({
      amount: parseFloat(amount),
      email: metadata.email || 'test@example.com',
      reference,
      metadata,
      currency
    });
    
    if (result.success) {
      res.json({ 
        reference: result.data.reference,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        status: 'created' 
      });
    } else {
      res.status(500).json({ message: 'Failed to create payment checkout', error: result.error });
    }
  } catch (e) { 
    console.error('Paystack create error', e); 
    res.status(500).json({ message: 'Failed to create payment checkout', error: e.message }); 
  }
});

router.post('/payments/verify', async (req, res) => {
  try { 
    const { reference } = req.body; 
    if (!reference) return res.status(400).json({ message: 'reference required' }); 
    
    const verification = await verifyPaystackTransaction(reference);
    
    if (verification.success) {
      const isPaid = verification.data.status === 'success';
      
      // If payment is successful, find and update the booking
      if (isPaid) {
        const booking = await Booking.findOne({ bookingReference: reference });
        if (booking && booking.paymentStatus !== 'paid') {
          // Update booking status to confirmed and paid
          const updatedBooking = await Booking.findByIdAndUpdate(booking._id, { 
            paymentStatus: 'paid', 
            status: 'confirmed',
            paymentId: verification.data.id,
            paymentMethod: 'paystack',
            paidAt: new Date()
          }, { new: true })
            .populate('roomUnitId', 'unitNumber unitName floor status')
            .populate('roomTypeId', 'name type price maxGuests amenities');
            
          if (updatedBooking) {
            // Send confirmation email
            const bookingWithRoom = { 
              ...updatedBooking.toObject(), 
              room: updatedBooking.roomTypeId, 
              roomUnit: updatedBooking.roomUnitId 
            };
            
            try {
              await sendBookingConfirmation(bookingWithRoom);
              console.log(`✅ Booking ${booking._id} confirmed and confirmation email sent to ${booking.guestEmail}`);
            } catch (emailError) {
              console.error('❌ Failed to send confirmation email:', emailError);
              // Don't fail the payment verification if email fails
            }
          }
        } else if (booking && booking.paymentStatus === 'paid') {
          console.log(`Booking ${booking._id} already confirmed`);
        } else {
          console.log(`No booking found for reference ${reference}`);
        }
      }
      
      res.json({ 
        status: verification.data.status, 
        paid: isPaid,
        amount: verification.data.amount / 100, // Convert from cents
        currency: verification.data.currency,
        reference: verification.data.reference,
        bookingConfirmed: isPaid && booking ? true : false,
        raw: verification.data 
      });
    } else {
      res.status(400).json({ 
        message: 'Failed to verify payment', 
        error: verification.error 
      });
    }
  }
  catch (e) { 
    console.error('Paystack verify error', e); 
    res.status(500).json({ message: 'Failed to verify payment', error: e.message }); 
  }
});

router.post('/payments/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // Handle Paystack webhook events
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      
      if (reference) {
        // Find booking by reference (more reliable than metadata.bookingId)
        const booking = await Booking.findOne({ bookingReference: reference });
        
        if (booking && booking.paymentStatus !== 'paid') {
          // Verify the transaction with Paystack
          const verification = await verifyPaystackTransaction(reference);
          
          if (verification.success && verification.data.status === 'success') {
            const updatedBooking = await Booking.findByIdAndUpdate(booking._id, { 
              paymentStatus: 'paid', 
              status: 'confirmed',
              paymentId: verification.data.id,
              paymentMethod: 'paystack',
              paidAt: new Date()
            }, { new: true })
              .populate('roomUnitId', 'unitNumber unitName floor status')
              .populate('roomTypeId', 'name type price maxGuests amenities');
              
            if (updatedBooking) {
              // Send confirmation email
              const bookingWithRoom = { 
                ...updatedBooking.toObject(), 
                room: updatedBooking.roomTypeId, 
                roomUnit: updatedBooking.roomUnitId 
              };
              
              try {
                await sendBookingConfirmation(bookingWithRoom);
                console.log(`✅ Webhook: Booking ${booking._id} confirmed and email sent to ${booking.guestEmail}`);
              } catch (emailError) {
                console.error('❌ Webhook: Failed to send confirmation email:', emailError);
              }
            }
          }
        } else if (booking && booking.paymentStatus === 'paid') {
          console.log(`Webhook: Booking ${booking._id} already confirmed`);
        } else {
          console.log(`Webhook: No booking found for reference ${reference}`);
        }
      }
    }
    
    res.json({ received: true });
  } catch (e) { 
    console.error('Webhook error', e); 
    res.status(500).json({ message: 'Webhook processing failed' }); 
  }
});

router.post('/bookings/with-payment', async (req, res) => {
  try {
    const data = insertBookingSchema.parse(req.body);
    const checkinDate = new Date(data.checkinDate);
    const checkoutDate = new Date(data.checkoutDate);
    
    // Get room type
    const roomType = await RoomType.findById(data.roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    
    // Check if room type can accommodate the number of guests
    if (data.numberOfGuests > roomType.maxGuests) {
      return res.status(400).json({ message: `This room type can only accommodate ${roomType.maxGuests} guests` });
    }
    
    // Check minimum stay requirement
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000*60*60*24));
    if (nights < roomType.minStay) {
      return res.status(400).json({ message: `Minimum stay is ${roomType.minStay} nights` });
    }
    
    // Check maximum stay requirement
    if (nights > roomType.maxStay) {
      return res.status(400).json({ message: `Maximum stay is ${roomType.maxStay} nights` });
    }
    
    // Check blackout dates
    const isBlackedOut = roomType.blackoutDates.some(blackout => {
      const blackoutStart = new Date(blackout.startDate);
      const blackoutEnd = new Date(blackout.endDate);
      return (checkinDate <= blackoutEnd && checkoutDate >= blackoutStart);
    });
    
    if (isBlackedOut) {
      return res.status(400).json({ message: 'Room type is not available for the selected dates due to blackout period' });
    }
    
    // Find available room unit
    let roomUnit;
    if (data.roomUnitId) {
      // Specific room unit requested
      roomUnit = await RoomUnit.findById(data.roomUnitId);
      if (!roomUnit || roomUnit.roomTypeId.toString() !== data.roomTypeId) {
        return res.status(404).json({ message: 'Requested room unit not found or not available for this room type' });
      }
      
      // Check if the specific unit is available
      const overlap = await Booking.exists({ 
        roomUnitId: data.roomUnitId, 
        status: { $ne: 'cancelled' }, 
        $or: [{ checkinDate: { $lte: checkoutDate }, checkoutDate: { $gte: checkinDate } }] 
      });
      
      if (overlap) {
        return res.status(400).json({ message: 'Requested room unit is not available for the selected dates' });
      }
    } else {
      // Auto-assign available room unit
      const availableUnits = await RoomUnit.find({
        roomTypeId: data.roomTypeId,
        isAvailable: true,
        status: 'available',
        $or: [
          { maintenanceStartDate: { $exists: false } },
          { maintenanceStartDate: { $gt: checkoutDate } },
          { maintenanceEndDate: { $lt: checkinDate } }
        ]
      });
      
      // Check for booking conflicts
      const conflictingBookings = await Booking.find({
        roomTypeId: data.roomTypeId,
        status: { $ne: 'cancelled' },
        $or: [
          { checkinDate: { $lte: checkoutDate }, checkoutDate: { $gte: checkinDate } }
        ]
      });
      
      const occupiedUnitIds = new Set(conflictingBookings.map(booking => booking.roomUnitId.toString()));
      const availableUnitsList = availableUnits.filter(unit => 
        !occupiedUnitIds.has(unit._id.toString())
      );
      
      if (availableUnitsList.length === 0) {
        return res.status(400).json({ message: 'No room units available for the selected dates' });
      }
      
      // Select room unit based on guest preferences
      roomUnit = selectRoomUnit(availableUnitsList, data.guestPreferences);
    }
    
    // Calculate total amount (consider seasonal pricing)
    const basePrice = parseFloat(roomType.price);
    const seasonalMultiplier = getSeasonalPricingMultiplier(roomType, checkinDate);
    const totalAmount = (basePrice * nights * seasonalMultiplier).toFixed(2);
    
    // Generate booking reference
    const bookingReference = generateBookingReference();
    
    // Create booking
    const booking = await Booking.create({ 
      ...data, 
      roomUnitId: roomUnit._id,
      checkinDate, 
      checkoutDate, 
      totalAmount, 
      paymentStatus: 'pending', 
      status: 'pending',
      bookingReference,
      roomUnitNumber: roomUnit.unitNumber,
      roomTypeName: roomType.name
    });
    
    // Check if Paystack is configured
    if (!isPaystackConfigured()) {
      console.warn('Paystack not configured, using sandbox mode');
    }
    
    // Initialize Paystack transaction
    const paystackResult = await initializePaystackTransaction({
      amount: parseFloat(totalAmount),
      email: data.guestEmail,
      reference: bookingReference,
      metadata: {
        bookingId: booking._id.toString(),
        roomName: roomType.name,
        roomUnit: roomUnit.unitNumber,
        guestName: data.guestName,
        checkinDate: checkinDate.toISOString(),
        checkoutDate: checkoutDate.toISOString()
      },
      currency: 'ZAR', // South African Rand
      callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/booking.html?payment=callback&reference=${bookingReference}`
    });
    
    if (!paystackResult.success) {
      return res.status(500).json({ 
        message: 'Failed to initialize payment', 
        error: paystackResult.error 
      });
    }
    
    res.status(201).json({ 
      booking, 
      payment: { 
        reference: bookingReference,
        authorizationUrl: paystackResult.data.authorization_url,
        accessCode: paystackResult.data.access_code
      } 
    });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ message: 'Failed to create booking with payment' }); 
  }
});

export default router;
