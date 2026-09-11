import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

// Load (or lazily create) the global settings singleton.
export async function getSettings() {
  await dbConnect();
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) {
    doc = await Settings.create({ key: 'global' });
  }
  return doc;
}

// Turn the Mongoose Map (or plain object on older docs) into a plain object
// of { [departmentCode]: boolean } suitable for JSON responses.
export function paymentSlipDepartmentsToObject(doc) {
  const raw = doc?.payment_slip_departments;
  if (!raw) return {};
  if (raw instanceof Map) return Object.fromEntries(raw);
  if (typeof raw === 'object') return { ...raw };
  return {};
}

// True when a given department is allowed to upload payment slips. The global
// toggle is the master switch; a per-department entry may then disable a
// specific department. Departments without an entry default to enabled.
export function isPaymentSlipEnabledForDepartment(doc, department) {
  if (!doc?.payment_slip_enabled) return false;
  if (!department) return true;
  const map = doc.payment_slip_departments;
  let value;
  if (map instanceof Map) value = map.get(department);
  else if (map && typeof map === 'object') value = map[department];
  return value === undefined ? true : !!value;
}
