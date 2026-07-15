import { NextResponse } from 'next/server';
import { requirePermission, ADMIN_PERMISSIONS } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { logActivity } from '@/lib/activity-log';

// GET /api/admin/settings — current global settings (payments permission)
export async function GET(request) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    const doc = await getSettings();
    return NextResponse.json({
      payment_slip_enabled: doc.payment_slip_enabled,
      updated_at: doc.updated_at,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update the payment_slip_enabled toggle
// Body: { payment_slip_enabled: boolean }
export async function PUT(request) {
  try {
    const admin = await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    const body = await request.json().catch(() => ({}));
    if (typeof body.payment_slip_enabled !== 'boolean') {
      return NextResponse.json({ error: 'payment_slip_enabled must be a boolean' }, { status: 400 });
    }

    const doc = await getSettings();
    const previous = doc.payment_slip_enabled;
    if (previous === body.payment_slip_enabled) {
      return NextResponse.json({
        message: 'No change',
        payment_slip_enabled: doc.payment_slip_enabled,
      });
    }

    doc.payment_slip_enabled = body.payment_slip_enabled;
    doc.updated_at = new Date();
    await doc.save();

    await logActivity(
      admin.id,
      body.payment_slip_enabled ? 'payment_slip_uploads_enabled' : 'payment_slip_uploads_disabled',
      'student',
      'global',
      `Payment slip upload section ${previous ? 'was' : 'was not'} shown to students; now ${body.payment_slip_enabled ? 'shown' : 'hidden'}.`
    );

    return NextResponse.json({
      message: 'Settings updated',
      payment_slip_enabled: doc.payment_slip_enabled,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
