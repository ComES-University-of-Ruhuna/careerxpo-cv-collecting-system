import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, default: '' },
  website: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
