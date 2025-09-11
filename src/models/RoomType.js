import mongoose from 'mongoose';
const { Schema } = mongoose;

const RoomTypeSchema = new Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Deluxe Room"
  type: { type: String, required: true }, // e.g., "deluxe-room"
  description: { type: String, required: true },
  price: { type: String, required: true }, // Base price per night
  maxGuests: { type: Number, required: true },
  amenities: { type: [String], default: [] },
  images: [{ type: String }], // Multiple images for the room type
  size: { type: String }, // Room size in square meters
  bedType: { type: String }, // Single, Double, Queen, King
  view: { type: String }, // Garden, Mountain, Pool, etc.
  features: [{ type: String }], // Additional features
  cleaningFee: { type: Number, default: 0 },
  cancellationPolicy: { type: String, default: 'Free cancellation up to 24 hours before check-in' },
  isActive: { type: Boolean, default: true }, // Whether this room type is available for booking
  totalUnits: { type: Number, required: true, default: 1 }, // Total number of units of this type
  availableUnits: { type: Number, required: true, default: 1 }, // Currently available units
  // Pricing rules
  seasonalPricing: [{
    name: String, // e.g., "Summer", "Winter"
    startDate: Date,
    endDate: Date,
    priceMultiplier: { type: Number, default: 1.0 }, // 1.2 = 20% increase
    isActive: { type: Boolean, default: true }
  }],
  // Minimum stay requirements
  minStay: { type: Number, default: 1 }, // Minimum nights
  maxStay: { type: Number, default: 30 }, // Maximum nights
  // Blackout dates
  blackoutDates: [{ 
    startDate: Date, 
    endDate: Date, 
    reason: String 
  }]
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } 
});

// Index for efficient queries
RoomTypeSchema.index({ type: 1, isActive: 1 });
RoomTypeSchema.index({ 'seasonalPricing.startDate': 1, 'seasonalPricing.endDate': 1 });

export default mongoose.model('RoomType', RoomTypeSchema);
