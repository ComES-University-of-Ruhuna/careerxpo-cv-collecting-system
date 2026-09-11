import mongoose from 'mongoose';

// Single-document "singleton" collection for app-wide toggles.
// A single row is kept keyed by `key: 'global'`. Add new fields here as
// the platform gains more configurable behaviour.
const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  // Whether students see the "Registration Fee" payment-slip upload section
  // on their profile page. Admins toggle this from the Payments tab.
  payment_slip_enabled: { type: Boolean, default: true },
  // Per-department override for the payment-slip upload section. Keys are
  // department codes (e.g. 'DEIE'); a missing key is treated as enabled.
  // Effective flag = payment_slip_enabled AND (department override ?? true).
  payment_slip_departments: {
    type: Map,
    of: Boolean,
    default: () => new Map(),
  },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
