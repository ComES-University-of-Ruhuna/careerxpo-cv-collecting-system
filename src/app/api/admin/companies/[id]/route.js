import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import Bid from '@/models/Bid';
import { requirePermission, isValidObjectId, ADMIN_PERMISSIONS } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { invalidateCompanyCaches } from '@/lib/cache';

export async function GET(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await dbConnect();
    const company = await Company.findById(params.id);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const admin = await requirePermission(request, ADMIN_PERMISSIONS.COMPANIES);
    await dbConnect();

    const { name, logo, website } = await request.json();

    const company = await Company.findByIdAndUpdate(
      params.id,
      { name, logo, website },
      { new: true, runValidators: true }
    );

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    await logActivity(admin.id, 'company_updated', 'company', params.id, `Updated company "${company.name}"`);
    await invalidateCompanyCaches();
    return NextResponse.json({ company });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const admin = await requirePermission(request, ADMIN_PERMISSIONS.COMPANIES);
    await dbConnect();

    const company = await Company.findByIdAndDelete(params.id);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    // Find job IDs before deleting them, then clean up bids
    const jobIds = await Job.find({ company_id: params.id }).distinct('_id');
    await Job.deleteMany({ company_id: params.id });
    if (jobIds.length > 0) {
      await Bid.deleteMany({ job_id: { $in: jobIds } });
    }

    await logActivity(admin.id, 'company_deleted', 'company', params.id, `Deleted company "${company.name}"`);
    await invalidateCompanyCaches();
    return NextResponse.json({ message: 'Company deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
