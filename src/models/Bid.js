import mongoose from 'mongoose';

const BidSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  credits_spent: { type: Number, required: true },
  cv_drive_id: { type: String, default: null },
  cv_url: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

BidSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

export default mongoose.models.Bid || mongoose.model('Bid', BidSchema);
