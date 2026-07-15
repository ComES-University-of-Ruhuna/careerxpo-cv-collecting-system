import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

// GET /api/settings
// Exposes the subset of settings that authenticated users (students, admins)
// need to render their UI. Requires a valid session but no special permission.
export async function GET(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = await getSettings();
    return NextResponse.json({
      payment_slip_enabled: doc.payment_slip_enabled,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
