const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/careerxpo';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const UserSchema = new mongoose.Schema({
  google_id: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  full_name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  registration_no: { type: String, unique: true, sparse: true, uppercase: true },
  linkedin: { type: String, default: '' },
  password_hash: { type: String, default: null },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  cv_drive_id: { type: String, default: null },
  cv_url: { type: String, default: null },
  remaining_credits: { type: Number, default: 100 },
  profile_completed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);

    const existing = await User.findOne({ registration_no: ADMIN_USERNAME });
    if (existing) {
      console.log('Admin account already exists. Skipping seed.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      registration_no: ADMIN_USERNAME,
      password_hash: hash,
      role: 'admin',
      remaining_credits: 0,
    });

    console.log(`Admin account created: ${ADMIN_USERNAME}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
