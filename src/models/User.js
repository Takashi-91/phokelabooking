import mongoose from 'mongoose';
const { Schema } = mongoose;
const UserSchema = new Schema({
  id: { type: String, index: true },
  email: { type: String, index: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model('User', UserSchema);
