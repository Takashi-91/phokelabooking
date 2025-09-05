import mongoose from 'mongoose';
const { Schema } = mongoose;
const ContactMessageSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
export default mongoose.model('ContactMessage', ContactMessageSchema);
