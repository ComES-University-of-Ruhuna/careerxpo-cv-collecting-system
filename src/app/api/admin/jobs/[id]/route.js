import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import { requireAdmin, isValidObjectId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await dbConnect();
    const job = await Job.findById(params.id).populate('company_id', 'name');
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const admin = requireAdmin(request);
    await dbConnect();

    const { title, description, company_id, credit_cost, departments, max_applicants, deadline, is_closed } = await request.json();

    const update = { title, description, company_id };
    if (credit_cost !== undefined) {
      const parsedCost = parseInt(credit_cost, 10);
      if (!parsedCost || parsedCost < 1) {
        return NextResponse.json({ error: 'Credit cost must be a positive integer' }, { status: 400 });
      }
      update.credit_cost = parsedCost;
    }
    if (departments !== undefined) {
      update.departments = departments;
    }
    if (max_applicants !== undefined) {
      if (max_applicants === null || max_applicants === '') {
        update.max_applicants = null;
      } else {
        const parsedMax = parseInt(max_applicants, 10);
        if (isNaN(parsedMax) || parsedMax < 1) {
          return NextResponse.json({ error: 'Max applicants must be a positive integer' }, { status: 400 });
        }
        update.max_applicants = parsedMax;
      }
    }
    if (deadline !== undefined) {
      update.deadline = deadline ? new Date(deadline) : null;
    }
    if (is_closed !== undefined) {
      update.is_closed = !!is_closed;
    }

    const job = await Job.findByIdAndUpdate(
      params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    await logActivity(admin.id, 'job_updated', 'job', params.id, `Updated job "${job.title}"`);
    return NextResponse.json({ job });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const job = await Job.findByIdAndDelete(params.id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    await logActivity(admin.id, 'job_deleted', 'job', params.id, `Deleted job "${job.title}"`);
    return NextResponse.json({ message: 'Job deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
