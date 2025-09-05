import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const uri = process.env.MONGO_URI;
mongoose.set('strictQuery', true);
mongoose.connect(uri, { autoIndex: true })
  .then(()=>console.log('Connected to MongoDB'))
  .catch((e)=>{ console.error('Mongo error', e); process.exit(1); });
export default mongoose;
