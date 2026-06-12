import mongoose from 'mongoose';

const DEPARTMENTS = ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA'];

const JobSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  credit_cost: { type: Number, required: true, min: 1, default: 10 },
  max_applicants: { type: Number, default: null, min: 1 },
  deadline: { type: Date, default: null },
  is_closed: { type: Boolean, default: false },
  departments: [{ type: String, enum: DEPARTMENTS }],
  created_at: { type: Date, default: Date.now },
});

export { DEPARTMENTS };

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
