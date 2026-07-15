import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requirePermission, isValidObjectId, ADMIN_PERMISSIONS } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

const VALID_STATUSES = ['pending', 'verified', 'rejected'];

// PATCH /api/admin/payments/[id]
// Body: { status: 'verified' | 'rejected' | 'pending' }
// Updates a student's payment_slip_status. Restricted to admins with the
// 'payments' permission.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const admin = await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const status = String(body?.status || '').trim();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const user = await User.findById(id).select(
      'full_name email registration_no role payment_slip_status payment_slip_url'
    );
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    if (!user.payment_slip_url) {
      return NextResponse.json({ error: 'This student has not submitted a payment slip' }, { status: 400 });
    }

    const previous = user.payment_slip_status || 'none';
    if (previous === status) {
      return NextResponse.json({
        message: 'Status unchanged',
        payment_slip_status: previous,
      });
    }

    user.payment_slip_status = status;
    await user.save();

    await logActivity(
      admin.id,
      'payment_slip_status_updated',
      'student',
      id,
      `Payment slip for "${user.full_name || user.email}" (${user.registration_no || 'no reg'}) — ${previous} → ${status}`
    );

    return NextResponse.json({
      message: 'Payment status updated',
      payment_slip_status: status,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Update payment status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
