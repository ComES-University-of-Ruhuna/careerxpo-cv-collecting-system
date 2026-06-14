import mongoose from 'mongoose';

const LinkedInJobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company_name: { type: String, required: true },
  linkedin_url: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
});

LinkedInJobSchema.index({ is_active: 1, created_at: -1 });

export default mongoose.models.LinkedInJob || mongoose.model('LinkedInJob', LinkedInJobSchema);
