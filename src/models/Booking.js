import mongoose from 'mongoose';
const { Schema } = mongoose;
const BookingSchema = new Schema({
  userId: { type: String },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  guestName: { type: String, required: true },
  guestEmail: { type: String, required: true },
  guestPhone: { type: String, required: true },
  guestAddress: { type: String },
  guestIdNumber: { type: String }, // For identification
  checkinDate: { type: Date, required: true },
  checkoutDate: { type: Date, required: true },
  numberOfGuests: { type: Number, required: true },
  totalAmount: { type: String, required: true },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  status: { type: String, enum: ['pending','confirmed','cancelled','checked-in','checked-out'], default: 'pending' },
  specialRequests: { type: String },
  bookingReference: { type: String, unique: true }, // Human-readable booking reference
  paymentMethod: { type: String }, // Credit card, bank transfer, etc.
  paymentId: { type: String }, // External payment ID
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  notes: { type: String }, // Admin notes
  source: { type: String, default: 'website' }, // website, phone, walk-in, etc.
  discountCode: { type: String },
  discountAmount: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  fees: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
export default mongoose.model('Booking', BookingSchema);
