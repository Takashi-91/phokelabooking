import mongoose from 'mongoose';
const { Schema } = mongoose;

const RoomUnitSchema = new Schema({
  roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
  unitNumber: { type: String, required: true }, // e.g., "101", "102", "A1", "B2"
  unitName: { type: String, required: true }, // e.g., "Deluxe Room #101"
  floor: { type: Number }, // Floor number
  isAvailable: { type: Boolean, default: true }, // Individual unit availability
  isMaintenance: { type: Boolean, default: false }, // Under maintenance
  maintenanceReason: { type: String }, // Reason for maintenance
  maintenanceStartDate: { type: Date },
  maintenanceEndDate: { type: Date },
  // Unit-specific features (can override room type features)
  specialFeatures: [{ type: String }],
  // Unit-specific notes
  notes: { type: String },
  // Last cleaned date
  lastCleaned: { type: Date },
  // Unit status
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'maintenance', 'out-of-order', 'cleaning'],
    default: 'available' 
  }
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } 
});

// Compound index for efficient queries
RoomUnitSchema.index({ roomTypeId: 1, isAvailable: 1 });
RoomUnitSchema.index({ unitNumber: 1 }, { unique: true });
RoomUnitSchema.index({ status: 1 });

// Virtual for room type details
RoomUnitSchema.virtual('roomType', {
  ref: 'RoomType',
  localField: 'roomTypeId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
RoomUnitSchema.set('toJSON', { virtuals: true });

export default mongoose.model('RoomUnit', RoomUnitSchema);
