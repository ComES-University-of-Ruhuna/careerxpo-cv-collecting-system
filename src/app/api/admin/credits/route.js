import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function POST(request) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const { amount } = await request.json();
    const credits = parseInt(amount, 10);

    if (!credits || credits < 1 || credits > 10000) {
      return NextResponse.json({ error: 'Amount must be between 1 and 10,000' }, { status: 400 });
    }

    const result = await User.updateMany(
      { role: 'student' },
      { $inc: { remaining_credits: credits } }
    );

    await logActivity(
      admin.id,
      'credits_added',
      'student',
      null,
      `Added ${credits} credits to all students (${result.modifiedCount} accounts)`
    );

    return NextResponse.json({
      message: `Added ${credits} credits to ${result.modifiedCount} student(s)`,
      students_updated: result.modifiedCount,
      credits_added: credits,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
