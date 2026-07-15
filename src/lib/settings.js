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
