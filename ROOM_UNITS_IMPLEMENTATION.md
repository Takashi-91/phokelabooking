# 🏨 Room Units Implementation Guide

## Overview

This implementation enhances the booking system to support **multiple units of the same room type**. Instead of having individual room records, the system now uses:

- **Room Types**: Templates that define room characteristics (e.g., "Deluxe Room")
- **Room Units**: Individual instances of room types (e.g., "Deluxe Room #101", "Deluxe Room #102")

## 🏗️ Data Model Architecture

### RoomType Model
```javascript
{
  name: "Deluxe Room",                    // Display name
  type: "deluxe-room",                   // URL-friendly identifier
  description: "Spacious room with...",   // Room description
  price: "1250.00",                      // Base price per night
  maxGuests: 4,                          // Maximum occupancy
  amenities: ["King Bed", "Mountain View"], // Room amenities
  totalUnits: 5,                         // Total units of this type
  availableUnits: 4,                     // Currently available units
  isActive: true,                        // Whether type is bookable
  minStay: 1,                           // Minimum nights
  maxStay: 30,                          // Maximum nights
  seasonalPricing: [...],               // Seasonal price adjustments
  blackoutDates: [...]                  // Blackout periods
}
```

### RoomUnit Model
```javascript
{
  roomTypeId: ObjectId,                 // Reference to RoomType
  unitNumber: "101",                    // Unit identifier
  unitName: "Deluxe Room #101",         // Display name
  floor: 1,                            // Floor number
  isAvailable: true,                   // Unit availability
  status: "available",                 // available|occupied|maintenance|out-of-order|cleaning
  specialFeatures: ["accessible"],     // Unit-specific features
  maintenanceReason: "Renovation",     // Maintenance details
  lastCleaned: Date                    // Cleaning tracking
}
```

### Updated Booking Model
```javascript
{
  roomUnitId: ObjectId,                // Specific unit booked
  roomTypeId: ObjectId,                // Room type (for queries)
  roomUnitNumber: "101",               // Cached unit number
  roomTypeName: "Deluxe Room",         // Cached room type name
  guestPreferences: {                  // Guest preferences
    smoking: false,
    accessibility: true,
    floor: "1",
    view: "mountain"
  }
}
```

## 🚀 Key Features

### 1. **Multiple Units Support**
- Create multiple units of the same room type
- Each unit can have unique features (floor, view, accessibility)
- Individual unit maintenance and availability tracking

### 2. **Smart Room Assignment**
- Automatic room unit assignment based on availability
- Guest preference matching (floor, view, accessibility)
- Fallback to any available unit if preferences can't be met

### 3. **Advanced Availability Management**
- Room type level availability checking
- Unit-specific maintenance scheduling
- Blackout date support
- Minimum/maximum stay requirements

### 4. **Seasonal Pricing**
- Dynamic pricing based on dates
- Multiple seasonal periods per room type
- Price multipliers for peak/off-peak periods

### 5. **Enhanced Booking Logic**
- Booking reference generation (e.g., "PHK-24-ABC123")
- Guest preference tracking
- Room unit assignment with conflict checking
- Seasonal pricing calculation

## 📋 API Endpoints

### Public Endpoints
- `GET /api/room-types` - Get all available room types
- `GET /api/room-types/:id` - Get specific room type details
- `POST /api/room-types/:id/check-availability` - Check availability for dates
- `POST /api/room-types/:id/available-units` - Get available units for dates

### Admin Endpoints
- `POST /api/admin/room-types` - Create new room type
- `PUT /api/admin/room-types/:id` - Update room type
- `POST /api/admin/room-types/:id/units` - Add unit to room type
- `PUT /api/admin/room-units/:id` - Update room unit
- `GET /api/admin/room-units` - Get all room units

## 🔄 Migration Process

### Step 1: Run Migration Script
```bash
node src/utils/migrateToRoomUnits.js
```

This will:
- Convert existing Room records to RoomType + RoomUnit
- Update existing Bookings to reference room units
- Preserve all existing data

### Step 2: Update Frontend
- Update room listing to show room types instead of individual rooms
- Modify booking flow to work with room types
- Add room unit selection for admin interface

### Step 3: Test Thoroughly
- Verify all existing bookings work
- Test new room type creation
- Test room unit assignment
- Test availability checking

## 🎯 Usage Examples

### Creating a Room Type with Multiple Units
```javascript
// Create room type
const roomType = await RoomType.create({
  name: "Deluxe Room",
  type: "deluxe-room",
  description: "Spacious room with king bed",
  price: "1250.00",
  maxGuests: 4,
  totalUnits: 5,
  amenities: ["King Bed", "Mountain View", "Free WiFi"]
});

// Create individual units
for (let i = 1; i <= 5; i++) {
  await RoomUnit.create({
    roomTypeId: roomType._id,
    unitNumber: i.toString().padStart(3, '0'),
    unitName: `Deluxe Room #${i.toString().padStart(3, '0')}`,
    floor: Math.ceil(i / 2), // Units 1-2 on floor 1, 3-4 on floor 2, etc.
    isAvailable: true,
    status: 'available'
  });
}
```

### Checking Availability
```javascript
// Check if any units are available for dates
const availability = await checkRoomTypeAvailability(roomTypeId, {
  checkinDate: '2024-06-01',
  checkoutDate: '2024-06-05',
  numberOfGuests: 2
});

if (availability.available) {
  console.log(`${availability.availableUnits} units available`);
}
```

### Creating a Booking
```javascript
// Book specific room type (auto-assign unit)
const booking = await createBooking({
  roomTypeId: roomTypeId,
  checkinDate: '2024-06-01',
  checkoutDate: '2024-06-05',
  numberOfGuests: 2,
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  guestPreferences: {
    floor: '1',
    view: 'mountain',
    accessibility: false
  }
});
```

## 🔧 Configuration

### Environment Variables
No additional environment variables required - uses existing MongoDB connection.

### Database Indexes
The system automatically creates indexes for optimal performance:
- `{ roomTypeId: 1, isActive: 1 }` - Room type queries
- `{ roomUnitId: 1, checkinDate: 1, checkoutDate: 1 }` - Booking conflicts
- `{ unitNumber: 1 }` - Unit lookups

## 🚨 Important Notes

### Backward Compatibility
- Existing bookings continue to work
- Old Room model can be removed after migration
- API endpoints maintain compatibility

### Performance Considerations
- Room type queries are optimized with indexes
- Availability checking uses efficient aggregation
- Cached room information in bookings for faster lookups

### Data Integrity
- Room units are automatically created when room types are created
- Unit counts are maintained automatically
- Booking conflicts are prevented at the database level

## 🎉 Benefits

1. **Scalability**: Easily add more units of popular room types
2. **Flexibility**: Each unit can have unique features
3. **Maintenance**: Track individual unit maintenance schedules
4. **Pricing**: Support seasonal and dynamic pricing
5. **Guest Experience**: Better room assignment based on preferences
6. **Admin Control**: Granular control over individual units

This implementation provides a robust foundation for managing multiple units of the same room type while maintaining all existing functionality and adding powerful new features for room management and guest preferences.
