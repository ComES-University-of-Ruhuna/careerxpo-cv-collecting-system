import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import Bid from '@/models/Bid';
import Company from '@/models/Company';
import { authenticate, isValidObjectId } from '@/lib/auth';
import { sendBidConfirmationEmail } from '@/lib/email';

export async function GET(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const bids = await Bid.find({ user_id: decoded.id })
      .populate({
        path: 'job_id',
        select: 'title credit_cost company_id',
        populate: { path: 'company_id', select: 'name logo' },
      })
      .select('user_id job_id credits_spent cv_drive_id cv_url timestamp')
      .sort({ timestamp: -1 });

    return NextResponse.json({ bids });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { job_id } = await request.json();

    // Check profile completion
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.profile_completed) {
      return NextResponse.json({ error: 'Please complete your profile before bidding. Go to My Profile to add your registration number, name, department, and accept the data sharing consent.' }, { status: 403 });
    }

    if (!job_id || !isValidObjectId(job_id)) {
      return NextResponse.json({ error: 'Valid Job ID is required' }, { status: 400 });
    }

    // Check duplicate bid
    const existingBid = await Bid.findOne({ user_id: decoded.id, job_id });
    if (existingBid) {
      return NextResponse.json({ error: 'You have already bid on this position' }, { status: 409 });
    }

    const job = await Job.findById(job_id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if vacancy is closed (manually or by deadline)
    if (job.is_closed) {
      return NextResponse.json({ error: 'This position is closed for applications.' }, { status: 400 });
    }
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return NextResponse.json({ error: 'The application deadline for this position has passed.' }, { status: 400 });
    }

    // Check max applicants limit (first come first serve)
    if (job.max_applicants) {
      const currentBidCount = await Bid.countDocuments({ job_id });
      if (currentBidCount >= job.max_applicants) {
        return NextResponse.json(
          { error: 'This position has reached its maximum number of applicants.' },
          { status: 400 }
        );
      }
    }

    // Atomic credit deduction with balance check
    const user = await User.findOneAndUpdate(
      { _id: decoded.id, remaining_credits: { $gte: job.credit_cost } },
      { $inc: { remaining_credits: -job.credit_cost } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: `Insufficient credits. This position requires ${job.credit_cost} credits.` },
        { status: 400 }
      );
    }

    let bid;
    try {
      bid = await Bid.create({
        user_id: decoded.id,
        job_id,
        credits_spent: job.credit_cost,
      });
    } catch (bidError) {
      // Duplicate key error (race condition) — refund credits
      if (bidError.code === 11000) {
        await User.findByIdAndUpdate(decoded.id, { $inc: { remaining_credits: job.credit_cost } });
        return NextResponse.json({ error: 'You have already bid on this position' }, { status: 409 });
      }
      await User.findByIdAndUpdate(decoded.id, { $inc: { remaining_credits: job.credit_cost } });
      throw bidError;
    }

    // Send confirmation email (non-blocking)
    try {
      const company = await Company.findById(job.company_id).select('name');
      sendBidConfirmationEmail({
        to: user.email,
        studentName: user.full_name || 'Student',
        jobTitle: job.title,
        companyName: company?.name || 'Unknown Company',
        creditsSpent: job.credit_cost,
        remainingCredits: user.remaining_credits,
        cvUrl: user.cv_url,
      }).catch((err) => console.error('Failed to send bid confirmation email:', err));
    } catch (emailErr) {
      console.error('Email setup error:', emailErr);
    }

    return NextResponse.json({
      message: 'Bid placed successfully',
      bid,
      remaining_credits: user.remaining_credits,
    }, { status: 201 });
  } catch (error) {
    console.error('Bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
