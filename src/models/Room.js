import mongoose from 'mongoose';
const { Schema } = mongoose;
const RoomSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: String, required: true },
  maxGuests: { type: Number, required: true },
  amenities: { type: [String], default: [] },
  imageUrl: String,
  images: [{ type: String }], // Multiple images
  isAvailable: { type: Boolean, default: true },
  size: { type: String }, // Room size in square meters
  bedType: { type: String }, // Single, Double, Queen, King
  view: { type: String }, // Garden, Mountain, Pool, etc.
  floor: { type: Number }, // Floor number
  roomNumber: { type: String, unique: true }, // Room number
  features: [{ type: String }], // Additional features
  cleaningFee: { type: Number, default: 0 },
  cancellationPolicy: { type: String, default: 'Free cancellation up to 24 hours before check-in' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
export default mongoose.model('Room', RoomSchema);
