import mongoose from 'mongoose';

const DEPARTMENTS = ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA'];

const GuestPostSchema = new mongoose.Schema({
  // Contact details
  contact_name: { type: String, required: true },
  contact_email: { type: String, required: true, lowercase: true },
  contact_phone: { type: String, required: true },
  // Company info
  company_name: { type: String, required: true },
  company_website: { type: String, default: '' },
  company_logo: { type: String, default: '' },
  // Job details
  job_title: { type: String, required: true },
  job_description: { type: String, default: '' },
  departments: [{ type: String, enum: DEPARTMENTS }],
  max_applicants: { type: Number, default: null, min: 1 },
  deadline: { type: Date, default: null },
  // Admin fields
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  credit_cost: { type: Number, default: null, min: 1 },
  admin_note: { type: String, default: '' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewed_at: { type: Date, default: null },
  // Timestamps
  created_at: { type: Date, default: Date.now },
});

export { DEPARTMENTS };

export default mongoose.models.GuestPost || mongoose.model('GuestPost', GuestPostSchema);
