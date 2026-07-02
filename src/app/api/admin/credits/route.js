import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

const VALID_DEPARTMENTS = ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA'];

export async function POST(request) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const { amount, department } = await request.json();
    const credits = parseInt(amount, 10);

    if (!credits || credits < 1 || credits > 10000) {
      return NextResponse.json({ error: 'Amount must be between 1 and 10,000' }, { status: 400 });
    }

    const filter = { role: 'student' };
    let scopeLabel = 'all students';

    if (department && department !== 'all') {
      if (!VALID_DEPARTMENTS.includes(department)) {
        return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
      }
      filter.department = department;
      scopeLabel = `${department} students`;
    }

    const result = await User.updateMany(filter, { $inc: { remaining_credits: credits } });

    await logActivity(
      admin.id,
      'credits_added',
      'student',
      null,
      `Added ${credits} credits to ${scopeLabel} (${result.modifiedCount} accounts)`
    );

    return NextResponse.json({
      message: `Added ${credits} credits to ${result.modifiedCount} ${scopeLabel}`,
      students_updated: result.modifiedCount,
      credits_added: credits,
      department: department && department !== 'all' ? department : null,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
