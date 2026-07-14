import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  google_id: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  full_name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  registration_no: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    match: /^EG\/20\d{2}\/\d{4}$/,
    index: true,
  },
  linkedin: { type: String, default: '' },
  department: {
    type: String,
    enum: ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA', null],
    default: null,
  },
  sub_specialization: {
    type: [String],
    default: [],
  },
  password_hash: { type: String, default: null },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  admin_permissions: {
    type: [String],
    enum: ['dashboard', 'companies', 'jobs', 'linkedin-jobs', 'guest-posts', 'students', 'logs'],
    default: [],
  },
  // Monotonically-increasing counter used to invalidate outstanding JWTs
  // when an account's authorization surface changes (role change, admin
  // permission grant/revoke, hard logout, etc.). The token payload carries
  // the version at sign time; auth helpers compare it against the DB and
  // reject tokens that fall behind.
  token_version: { type: Number, default: 0 },
  cv_drive_id: { type: String, default: null },
  cv_url: { type: String, default: null },
  remaining_credits: { type: Number, default: 100 },
  cv_consent: { type: Boolean, default: false },
  cv_consent_at: { type: Date, default: null },
  profile_completed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
