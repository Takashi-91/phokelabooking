import mongoose from 'mongoose';
const { Schema } = mongoose;
const BookingSchema = new Schema({
  userId: { type: String },
  roomUnitId: { type: Schema.Types.ObjectId, ref: 'RoomUnit', required: true },
  roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true }, // For easier queries
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
  fees: { type: Number, default: 0 },
  // Room unit information (cached for performance)
  roomUnitNumber: { type: String }, // e.g., "101"
  roomTypeName: { type: String }, // e.g., "Deluxe Room"
  // Check-in/out tracking
  actualCheckinTime: { type: Date },
  actualCheckoutTime: { type: Date },
  // Guest preferences
  guestPreferences: {
    smoking: { type: Boolean, default: false },
    accessibility: { type: Boolean, default: false },
    floor: { type: String }, // Preferred floor
    view: { type: String } // Preferred view
  }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Indexes for efficient queries
BookingSchema.index({ roomUnitId: 1, checkinDate: 1, checkoutDate: 1 });
BookingSchema.index({ roomTypeId: 1, checkinDate: 1, checkoutDate: 1 });
BookingSchema.index({ guestEmail: 1 });
BookingSchema.index({ bookingReference: 1 });
BookingSchema.index({ status: 1, paymentStatus: 1 });
export default mongoose.model('Booking', BookingSchema);
