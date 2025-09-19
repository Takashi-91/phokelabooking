import express from 'express';
import { z } from 'zod';
import RoomType from '../models/RoomType.js';
import RoomUnit from '../models/RoomUnit.js';
import Booking from '../models/Booking.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const roomTypeSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  maxGuests: z.number().min(1),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  size: z.string().optional(),
  bedType: z.string().optional(),
  view: z.string().optional(),
  features: z.array(z.string()).default([]),
  cleaningFee: z.number().default(0),
  cancellationPolicy: z.string().default('Free cancellation up to 24 hours before check-in'),
  isActive: z.boolean().default(true),
  totalUnits: z.number().min(1).default(1),
  minStay: z.number().min(1).default(1),
  maxStay: z.number().min(1).default(30)
});

const roomUnitSchema = z.object({
  roomTypeId: z.string().min(1),
  unitNumber: z.string().min(1),
  unitName: z.string().min(1),
  floor: z.number().optional(),
  isAvailable: z.boolean().default(true),
  isMaintenance: z.boolean().default(false),
  maintenanceReason: z.string().optional(),
  maintenanceStartDate: z.string().optional(),
  maintenanceEndDate: z.string().optional(),
  specialFeatures: z.array(z.string()).default([]),
  notes: z.string().optional()
});

// Get all room types (for public booking)
router.get('/room-types', async (req, res) => {
  try {
    const roomTypes = await RoomType.find({ isActive: true }).lean();
    
    // Get room units for each room type
    const roomTypesWithAvailability = await Promise.all(roomTypes.map(async (roomType) => {
      const roomUnits = await RoomUnit.find({ roomTypeId: roomType._id }).lean();
      const availableUnits = roomUnits.filter(unit => 
        unit.status === 'available'
      ).length;
      
      return {
        ...roomType,
        availableUnits,
        totalUnits: roomUnits.length
      };
    }));
    
    res.json(roomTypesWithAvailability);
  } catch (error) {
    console.error('Failed to fetch room types:', error);
    res.status(500).json({ message: 'Failed to fetch room types' });
  }
});

// Get room type by ID
router.get('/room-types/:id', async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id)
      .populate('roomUnits', 'unitNumber unitName isAvailable status floor specialFeatures');
    
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    
    res.json(roomType);
  } catch (error) {
    console.error('Failed to fetch room type:', error);
    res.status(500).json({ message: 'Failed to fetch room type' });
  }
});

// Check availability for a room type
router.post('/room-types/:id/check-availability', async (req, res) => {
  try {
    const { checkinDate, checkoutDate, numberOfGuests = 1 } = req.body;
    
    if (!checkinDate || !checkoutDate) {
      return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    }
    
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // Get room type
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    
    // Check if room type can accommodate the number of guests
    if (numberOfGuests > roomType.maxGuests) {
      return res.json({ 
        available: false, 
        reason: `This room type can only accommodate ${roomType.maxGuests} guests` 
      });
    }
    
    // Check minimum stay requirement
    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    if (nights < roomType.minStay) {
      return res.json({ 
        available: false, 
        reason: `Minimum stay is ${roomType.minStay} nights` 
      });
    }
    
    // Check maximum stay requirement
    if (nights > roomType.maxStay) {
      return res.json({ 
        available: false, 
        reason: `Maximum stay is ${roomType.maxStay} nights` 
      });
    }
    
    // Check blackout dates
    const isBlackedOut = roomType.blackoutDates.some(blackout => {
      const blackoutStart = new Date(blackout.startDate);
      const blackoutEnd = new Date(blackout.endDate);
      return (checkin <= blackoutEnd && checkout >= blackoutStart);
    });
    
    if (isBlackedOut) {
      return res.json({ 
        available: false, 
        reason: 'Room type is not available for the selected dates due to blackout period' 
      });
    }
    
    // Get available room units for this room type
    const availableUnits = await RoomUnit.find({
      roomTypeId: req.params.id,
      isAvailable: true,
      status: 'available',
      $or: [
        { maintenanceStartDate: { $exists: false } },
        { maintenanceStartDate: { $gt: checkout } },
        { maintenanceEndDate: { $lt: checkin } }
      ]
    });
    
    // Check for booking conflicts
    const conflictingBookings = await Booking.find({
      roomTypeId: req.params.id,
      status: { $ne: 'cancelled' },
      $or: [
        { checkinDate: { $lte: checkout }, checkoutDate: { $gte: checkin } }
      ]
    });
    
    // Calculate how many units are available
    const occupiedUnits = new Set(conflictingBookings.map(booking => booking.roomUnitId.toString()));
    const availableUnitsCount = availableUnits.filter(unit => 
      !occupiedUnits.has(unit._id.toString())
    ).length;
    
    res.json({ 
      available: availableUnitsCount > 0,
      availableUnits: availableUnitsCount,
      totalUnits: availableUnits.length,
      roomType: {
        name: roomType.name,
        price: roomType.price,
        maxGuests: roomType.maxGuests
      }
    });
    
  } catch (error) {
    console.error('Failed to check availability:', error);
    res.status(500).json({ message: 'Failed to check availability' });
  }
});

// Get available room units for a specific room type and date range
router.post('/room-types/:id/available-units', async (req, res) => {
  try {
    const { checkinDate, checkoutDate } = req.body;
    
    if (!checkinDate || !checkoutDate) {
      return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    }
    
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // Get all room units for this room type
    const roomUnits = await RoomUnit.find({
      roomTypeId: req.params.id,
      isAvailable: true,
      status: 'available'
    });
    
    // Check for booking conflicts for each unit
    const availableUnits = [];
    
    for (const unit of roomUnits) {
      const conflict = await Booking.exists({
        roomUnitId: unit._id,
        status: { $ne: 'cancelled' },
        $or: [
          { checkinDate: { $lte: checkout }, checkoutDate: { $gte: checkin } }
        ]
      });
      
      if (!conflict) {
        availableUnits.push(unit);
      }
    }
    
    res.json(availableUnits);
    
  } catch (error) {
    console.error('Failed to fetch available units:', error);
    res.status(500).json({ message: 'Failed to fetch available units' });
  }
});

// Admin routes for room type management
router.get('/admin/room-types', requireAdmin, async (req, res) => {
  try {
    const roomTypes = await RoomType.find().lean();
    
    // Get room units for each room type
    const roomTypesWithAvailability = await Promise.all(roomTypes.map(async (roomType) => {
      const roomUnits = await RoomUnit.find({ roomTypeId: roomType._id }).lean();
      const availableUnits = roomUnits.filter(unit => 
        unit.status === 'available'
      ).length;
      
      return {
        ...roomType,
        availableUnits,
        totalUnits: roomUnits.length
      };
    }));
    
    res.json(roomTypesWithAvailability);
  } catch (error) {
    console.error('Failed to fetch room types:', error);
    res.status(500).json({ message: 'Failed to fetch room types' });
  }
});

router.post('/admin/room-types', requireAdmin, async (req, res) => {
  try {
    const data = roomTypeSchema.parse(req.body);
    const roomType = new RoomType(data);
    await roomType.save();
    
    // Create initial room units
    const units = [];
    for (let i = 1; i <= data.totalUnits; i++) {
      const unitNumber = i.toString().padStart(3, '0');
      const unit = new RoomUnit({
        roomTypeId: roomType._id,
        unitNumber,
        unitName: `${data.name} #${unitNumber}`,
        isAvailable: true,
        status: 'available'
      });
      await unit.save();
      units.push(unit);
    }
    
    roomType.roomUnits = units.map(unit => unit._id);
    await roomType.save();
    
    res.status(201).json(roomType);
  } catch (error) {
    console.error('Failed to create room type:', error);
    res.status(500).json({ message: 'Failed to create room type' });
  }
});

// Update room type
router.put('/admin/room-types/:id', requireAdmin, async (req, res) => {
  try {
    const data = roomTypeSchema.partial().parse(req.body);
    const roomType = await RoomType.findByIdAndUpdate(req.params.id, data, { new: true });
    
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    
    res.json(roomType);
  } catch (error) {
    console.error('Failed to update room type:', error);
    res.status(500).json({ message: 'Failed to update room type' });
  }
});

// Add room unit to existing room type
router.post('/admin/room-types/:id/units', requireAdmin, async (req, res) => {
  try {
    const { unitNumber, floor, specialFeatures = [], notes } = req.body;
    
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    
    const unit = new RoomUnit({
      roomTypeId: req.params.id,
      unitNumber,
      unitName: `${roomType.name} #${unitNumber}`,
      floor,
      specialFeatures,
      notes,
      isAvailable: true,
      status: 'available'
    });
    
    await unit.save();
    
    // Update room type total units count
    roomType.totalUnits += 1;
    roomType.availableUnits += 1;
    await roomType.save();
    
    res.status(201).json(unit);
  } catch (error) {
    console.error('Failed to create room unit:', error);
    res.status(500).json({ message: 'Failed to create room unit' });
  }
});

// Update room unit
router.put('/admin/room-units/:id', async (req, res) => {
  try {
    const data = roomUnitSchema.partial().parse(req.body);
    const unit = await RoomUnit.findByIdAndUpdate(req.params.id, data, { new: true });
    
    if (!unit) {
      return res.status(404).json({ message: 'Room unit not found' });
    }
    
    res.json(unit);
  } catch (error) {
    console.error('Failed to update room unit:', error);
    res.status(500).json({ message: 'Failed to update room unit' });
  }
});

// Get all room units for admin
router.get('/admin/room-units', requireAdmin, async (req, res) => {
  try {
    const units = await RoomUnit.find()
      .populate('roomTypeId', 'name type price maxGuests')
      .sort({ roomTypeId: 1, unitNumber: 1 });
    
    res.json(units);
  } catch (error) {
    console.error('Failed to fetch room units:', error);
    res.status(500).json({ message: 'Failed to fetch room units' });
  }
});

export default router;
