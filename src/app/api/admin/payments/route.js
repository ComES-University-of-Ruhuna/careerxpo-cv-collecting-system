import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requirePermission, ADMIN_PERMISSIONS } from '@/lib/auth';
import { DEPARTMENT_VALUES } from '@/lib/departments';

const VALID_STATUSES = ['pending', 'verified', 'rejected'];

// GET /api/admin/payments
// Query params:
//   status=pending|verified|rejected|all (default: all submitted)
//   department=DEIE|... (optional)
//   q=<name|reg_no|email>
//   limit=<int> (default 100, max 500)
export async function GET(request) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || '').trim();
    const department = (searchParams.get('department') || '').trim();
    const q = (searchParams.get('q') || '').trim();
    const limitRaw = Number(searchParams.get('limit') || 100);
    const limit = Math.max(1, Math.min(500, Number.isFinite(limitRaw) ? limitRaw : 100));

    const filter = {
      role: 'student',
      // Only include students who have actually submitted a slip.
      payment_slip_url: { $ne: null },
    };

    if (VALID_STATUSES.includes(status)) {
      filter.payment_slip_status = status;
    } else if (status && status !== 'all') {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    if (department) {
      if (!DEPARTMENT_VALUES.includes(department)) {
        return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
      }
      filter.department = department;
    }

    if (q && q.length >= 2) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { full_name: { $regex: escaped, $options: 'i' } },
        { registration_no: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const submissions = await User.find(filter)
      .select(
        'full_name email registration_no department avatar ' +
          'payment_slip_url payment_slip_drive_id payment_slip_uploaded_at ' +
          'payment_slip_status payment_details'
      )
      .sort({ payment_slip_uploaded_at: -1 })
      .limit(limit)
      .lean();

    // Aggregated counts for the tab badges (unfiltered by status).
    const countsAgg = await User.aggregate([
      { $match: { role: 'student', payment_slip_url: { $ne: null } } },
      { $group: { _id: '$payment_slip_status', count: { $sum: 1 } } },
    ]);
    const counts = { pending: 0, verified: 0, rejected: 0 };
    for (const row of countsAgg) {
      if (row._id && Object.prototype.hasOwnProperty.call(counts, row._id)) {
        counts[row._id] = row.count;
      }
    }

    return NextResponse.json({ submissions, counts });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('List payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
