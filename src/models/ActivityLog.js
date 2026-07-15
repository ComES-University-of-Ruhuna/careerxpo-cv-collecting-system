import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'company_created', 'company_updated', 'company_deleted',
      'job_created', 'job_updated', 'job_deleted',
      'linkedin_job_created', 'linkedin_job_updated', 'linkedin_job_deleted',
      'student_bids_reset', 'student_deleted', 'student_permissions_updated',
      'credits_added',
      'guest_post_approved', 'guest_post_rejected',
      'payment_slip_approved', 'payment_slip_rejected', 'payment_slip_reset',
    ],
    required: true,
  },
  target_type: { type: String, enum: ['company', 'job', 'linkedin_job', 'student', 'guest_post'], required: true },
  target_id: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now },
});

activityLogSchema.index({ timestamp: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
