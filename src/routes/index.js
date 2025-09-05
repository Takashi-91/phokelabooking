import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import ContactMessage from '../models/ContactMessage.js';
import Admin from '../models/Admin.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { createFastPayCheckout, verifyFastPayCheckout } from '../services/fastpay.js';
import { sendBookingConfirmation, sendBookingCancellation } from '../services/email.js';

const router = Router();

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
  roomId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(3),
  checkinDate: z.string(),
  checkoutDate: z.string(),
  numberOfGuests: z.number().int().positive(),
  specialRequests: z.string().optional()
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

router.get('/rooms', async (_req, res) => {
  try { const rooms = await Room.find().sort({ price: 1 }); res.json(rooms); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch rooms' }); }
});

router.get('/rooms/:id', async (req, res) => {
  try { const room = await Room.findById(req.params.id); if (!room) return res.status(404).json({ message: 'Room not found' }); res.json(room); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch room' }); }
});

router.post('/admin/rooms', requireAdmin, async (req, res) => {
  try { const data = insertRoomSchema.parse(req.body); const room = await Room.create(data); res.status(201).json(room); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create room' }); }
});

router.put('/admin/rooms/:id', requireAdmin, async (req, res) => {
  try { const data = insertRoomSchema.partial().parse(req.body); const room = await Room.findByIdAndUpdate(req.params.id, data, { new: true }); res.json(room); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update room' }); }
});

router.delete('/admin/rooms/:id', requireAdmin, async (req, res) => {
  try { await Room.findByIdAndDelete(req.params.id); res.json({ message: 'Room deleted successfully' }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to delete room' }); }
});

router.patch('/admin/rooms/:id/availability', requireAdmin, async (req, res) => {
  try { const { isAvailable } = req.body; const room = await Room.findByIdAndUpdate(req.params.id, { isAvailable }, { new: true }); res.json(room); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update room availability' }); }
});

router.post('/rooms/:id/check-availability', async (req, res) => {
  try {
    const { checkinDate, checkoutDate } = req.body;
    if (!checkinDate || !checkoutDate) return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    const cid = new Date(checkinDate), cod = new Date(checkoutDate);
    const conflict = await Booking.exists({ roomId: req.params.id, status: { $ne: 'cancelled' }, $or: [{ checkinDate: { $lte: cod }, checkoutDate: { $gte: cid } }] });
    res.json({ available: !conflict });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to check availability' }); }
});

router.get('/bookings', isAuthenticated, async (req, res) => {
  try {
    const sub = req.user.sub;
    const me = await User.findOne({ id: sub });
    const isAdmin = !!me?.isAdmin;
    const query = isAdmin ? {} : { userId: sub };
    const bookings = await Booking.find(query).sort({ createdAt: -1 }).populate('roomId');
    const results = bookings.map(b => ({ ...b.toObject(), room: b.roomId, roomId: b.roomId?._id?.toString() }));
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
  try { const bookings = await Booking.find().sort({ createdAt: -1 }).populate('roomId'); const results = bookings.map(b => ({ ...b.toObject(), room: b.roomId, roomId: b.roomId?._id?.toString() })); res.json(results); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch bookings' }); }
});

router.patch('/admin/bookings/:id', requireAdmin, async (req, res) => {
  try { 
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('roomId'); 
    
    // Send email notifications based on status change
    if (req.body.status === 'cancelled') {
      const bookingWithRoom = { ...updated.toObject(), room: updated.roomId };
      await sendBookingCancellation(bookingWithRoom);
    } else if (req.body.status === 'confirmed' && updated.paymentStatus === 'paid') {
      const bookingWithRoom = { ...updated.toObject(), room: updated.roomId };
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
    const totalRooms = await Room.countDocuments();
    const activeBookings = await Booking.countDocuments({ checkinDate: { $lte: now }, checkoutDate: { $gte: now }, status: { $ne: 'cancelled' } });
    const occupancyRate = totalRooms > 0 ? (activeBookings / totalRooms) * 100 : 0;
    res.json({ totalBookings, monthlyRevenue, occupancyRate });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch stats' }); }
});

router.post('/contact', async (req, res) => {
  try { const data = insertContactMessageSchema.parse(req.body); const message = await ContactMessage.create(data); res.status(201).json(message); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Failed to send message' }); }
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

router.post('/payments/create-checkout', async (req, res) => {
  try {
    const { amount, currency = 'IQD', metadata = {} } = req.body;
    if (!process.env.FASTPAY_STORE_ID || !process.env.FASTPAY_STORE_PASSWORD) return res.status(500).json({ message: 'Payment service not configured' });
    const orderId = metadata.orderId || `ord_${nanoid(12)}`;
    const session = await createFastPayCheckout({ amount: parseFloat(amount), currency, orderId, metadata });
    res.json({ checkoutId: session.checkoutId, redirectUrl: session.redirectUrl, status: 'created' });
  } catch (e) { console.error('FastPay create error', e.response?.data || e.message); res.status(500).json({ message: 'Failed to create payment checkout', error: e.message }); }
});

router.post('/payments/verify', async (req, res) => {
  try { const { checkoutId } = req.body; if (!checkoutId) return res.status(400).json({ message: 'checkoutId required' }); const data = await verifyFastPayCheckout(checkoutId); res.json({ status: data.status || data.payment_status || 'unknown', raw: data }); }
  catch (e) { console.error('FastPay verify error', e.response?.data || e.message); res.status(500).json({ message: 'Failed to verify payment', error: e.message }); }
});

router.post('/payments/webhook', async (req, res) => {
  try {
    const evt = req.body || {};
    const bookingId = evt?.metadata?.bookingId || evt?.order_id || evt?.orderId;
    const s = (evt.status || evt.payment_status || '').toLowerCase();
    const paid = ['paid','success','succeeded','completed'];
    if (bookingId && paid.includes(s)) {
      const booking = await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid', status: 'confirmed' }).populate('roomId');
      if (booking) {
        // Send confirmation email
        const bookingWithRoom = { ...booking.toObject(), room: booking.roomId };
        await sendBookingConfirmation(bookingWithRoom);
      }
    }
    res.json({ received: true });
  } catch (e) { console.error('Webhook error', e); res.status(500).json({ message: 'Webhook processing failed' }); }
});

router.post('/bookings/with-payment', async (req, res) => {
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
    const booking = await Booking.create({ ...data, checkinDate, checkoutDate, totalAmount, paymentStatus: 'pending', status: 'pending' });
    
    // Populate room data for email
    const bookingWithRoom = { ...booking.toObject(), room };
    
    const { redirectUrl, checkoutId } = await createFastPayCheckout({ amount: parseFloat(totalAmount), currency: 'IQD', orderId: booking._id.toString(), metadata: { bookingId: booking._id.toString(), roomName: room.name, guestName: data.guestName } });
    res.status(201).json({ booking, payment: { checkoutId, redirectUrl } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to create booking with payment' }); }
});

export default router;
