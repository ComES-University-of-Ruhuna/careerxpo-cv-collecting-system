import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'company_created', 'company_updated', 'company_deleted',
      'job_created', 'job_updated', 'job_deleted',
      'student_bids_reset', 'student_deleted',
      'credits_added',
      'guest_post_approved', 'guest_post_rejected',
    ],
    required: true,
  },
  target_type: { type: String, enum: ['company', 'job', 'student', 'guest_post'], required: true },
  target_id: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now },
});

activityLogSchema.index({ timestamp: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
