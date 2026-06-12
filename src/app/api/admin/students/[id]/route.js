import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Bid from '@/models/Bid';
import { requireAdmin, isValidObjectId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    requireAdmin(request);
    await dbConnect();

    const user = await User.findById(params.id).select('-password_hash');
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const bids = await Bid.find({ user_id: params.id })
      .populate({
        path: 'job_id',
        select: 'title company_id',
        populate: { path: 'company_id', select: 'name' },
      })
      .sort({ timestamp: -1 });

    return NextResponse.json({ student: user, bids });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reset bids — delete all bids and refund credits
export async function PUT(request, { params }) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const user = await User.findById(params.id);
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const bids = await Bid.find({ user_id: params.id });
    const totalRefund = bids.reduce((sum, b) => sum + b.credits_spent, 0);

    await Bid.deleteMany({ user_id: params.id });
    user.remaining_credits += totalRefund;
    await user.save();

    await logActivity(admin.id, 'student_bids_reset', 'student', params.id, `Reset ${bids.length} bid(s) for "${user.full_name || user.email}". Refunded ${totalRefund} credits.`);
    return NextResponse.json({
      message: `Reset ${bids.length} bid(s). Refunded ${totalRefund} credits.`,
      bids_removed: bids.length,
      credits_refunded: totalRefund,
      remaining_credits: user.remaining_credits,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete student account
export async function DELETE(request, { params }) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const user = await User.findById(params.id);
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await Bid.deleteMany({ user_id: params.id });
    await User.findByIdAndDelete(params.id);

    await logActivity(admin.id, 'student_deleted', 'student', params.id, `Deleted student "${user.full_name || user.email}"`);
    return NextResponse.json({ message: 'Student account deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
