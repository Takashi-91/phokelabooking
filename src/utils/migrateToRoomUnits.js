import mongoose from 'mongoose';
import Room from '../models/Room.js';
import RoomType from '../models/RoomType.js';
import RoomUnit from '../models/RoomUnit.js';
import Booking from '../models/Booking.js';

/**
 * Migration script to convert existing Room model to RoomType + RoomUnit structure
 * This script should be run once to migrate existing data
 */
export async function migrateToRoomUnits() {
  try {
    console.log('Starting migration to RoomType + RoomUnit structure...');
    
    // Get all existing rooms
    const existingRooms = await Room.find({});
    console.log(`Found ${existingRooms.length} existing rooms to migrate`);
    
    for (const room of existingRooms) {
      console.log(`Migrating room: ${room.name}`);
      
      // Create RoomType from existing room
      const roomType = new RoomType({
        name: room.name,
        type: room.type || room.name.toLowerCase().replace(/\s+/g, '-'),
        description: room.description,
        price: room.price,
        maxGuests: room.maxGuests,
        amenities: room.amenities || [],
        images: room.images || (room.imageUrl ? [room.imageUrl] : []),
        size: room.size,
        bedType: room.bedType,
        view: room.view,
        features: room.features || [],
        cleaningFee: room.cleaningFee || 0,
        cancellationPolicy: room.cancellationPolicy || 'Free cancellation up to 24 hours before check-in',
        isActive: room.isAvailable !== false,
        totalUnits: 1, // Default to 1 unit for existing rooms
        availableUnits: room.isAvailable !== false ? 1 : 0
      });
      
      await roomType.save();
      console.log(`Created RoomType: ${roomType.name} (${roomType._id})`);
      
      // Create RoomUnit from existing room
      const roomUnit = new RoomUnit({
        roomTypeId: roomType._id,
        unitNumber: room.roomNumber || '001', // Use existing room number or default
        unitName: `${room.name} #${room.roomNumber || '001'}`,
        floor: room.floor,
        isAvailable: room.isAvailable !== false,
        status: room.isAvailable !== false ? 'available' : 'out-of-order',
        specialFeatures: room.features || [],
        notes: `Migrated from original room: ${room._id}`
      });
      
      await roomUnit.save();
      console.log(`Created RoomUnit: ${roomUnit.unitName} (${roomUnit._id})`);
      
      // Update existing bookings to reference the new room unit
      const bookingsToUpdate = await Booking.find({ roomId: room._id });
      console.log(`Updating ${bookingsToUpdate.length} bookings for room ${room.name}`);
      
      for (const booking of bookingsToUpdate) {
        booking.roomUnitId = roomUnit._id;
        booking.roomTypeId = roomType._id;
        booking.roomUnitNumber = roomUnit.unitNumber;
        booking.roomTypeName = roomType.name;
        await booking.save();
      }
      
      console.log(`Updated ${bookingsToUpdate.length} bookings`);
    }
    
    console.log('Migration completed successfully!');
    console.log('You can now safely remove the old Room model and update your code to use RoomType + RoomUnit');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function to revert back to Room model
 * WARNING: This will delete RoomType and RoomUnit data
 */
export async function rollbackFromRoomUnits() {
  try {
    console.log('Rolling back to Room model...');
    
    // Delete all RoomUnits and RoomTypes
    await RoomUnit.deleteMany({});
    await RoomType.deleteMany({});
    
    // Reset bookings to use roomId instead of roomUnitId
    await Booking.updateMany(
      { roomUnitId: { $exists: true } },
      { 
        $unset: { 
          roomUnitId: 1, 
          roomTypeId: 1, 
          roomUnitNumber: 1, 
          roomTypeName: 1,
          actualCheckinTime: 1,
          actualCheckoutTime: 1,
          guestPreferences: 1
        }
      }
    );
    
    console.log('Rollback completed successfully!');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToRoomUnits()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
