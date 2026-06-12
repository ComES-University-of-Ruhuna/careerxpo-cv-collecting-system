import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import { requireAdmin, isValidObjectId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    const filter = companyId ? { company_id: companyId } : {};
    const jobs = await Job.find(filter).populate('company_id', 'name logo').sort({ created_at: -1 });
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const { company_id, title, description, credit_cost, departments, max_applicants, deadline } = await request.json();

    if (!company_id || !isValidObjectId(company_id)) {
      return NextResponse.json({ error: 'Valid company is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Company and title are required' }, { status: 400 });
    }

    if (title.length > 300) {
      return NextResponse.json({ error: 'Title is too long' }, { status: 400 });
    }

    if (description && description.length > 5000) {
      return NextResponse.json({ error: 'Description is too long' }, { status: 400 });
    }

    const parsedCost = parseInt(credit_cost, 10);
    if (!parsedCost || parsedCost < 1) {
      return NextResponse.json({ error: 'Credit cost must be a positive integer' }, { status: 400 });
    }

    const parsedMax = max_applicants ? parseInt(max_applicants, 10) : null;
    if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 1)) {
      return NextResponse.json({ error: 'Max applicants must be a positive integer' }, { status: 400 });
    }

    const job = await Job.create({
      company_id,
      title,
      description: description || '',
      credit_cost: parsedCost,
      max_applicants: parsedMax,
      deadline: deadline ? new Date(deadline) : null,
      departments: departments || [],
    });
    await logActivity(admin.id, 'job_created', 'job', job._id, `Created job "${title}"`);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
