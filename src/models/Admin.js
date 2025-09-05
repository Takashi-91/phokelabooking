import mongoose from 'mongoose';
const { Schema } = mongoose;
const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
export default mongoose.model('Admin', AdminSchema);
