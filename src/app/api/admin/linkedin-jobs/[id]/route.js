import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedInJob from '@/models/LinkedInJob';
import { requireAdmin, isValidObjectId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function PUT(request, { params }) {
  try {
    const id = (await params).id;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const admin = requireAdmin(request);
    await dbConnect();

    const { title, company_name, linkedin_url, description, location, is_active } = await request.json();

    const update = {};
    if (title !== undefined) {
      if (!title || title.length > 300) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
      update.title = title.trim();
    }
    if (company_name !== undefined) {
      if (!company_name || company_name.length > 200) return NextResponse.json({ error: 'Invalid company name' }, { status: 400 });
      update.company_name = company_name.trim();
    }
    if (linkedin_url !== undefined) {
      try {
        const url = new URL(linkedin_url);
        if (!url.hostname.endsWith('linkedin.com')) {
          return NextResponse.json({ error: 'URL must be a valid LinkedIn link' }, { status: 400 });
        }
        update.linkedin_url = linkedin_url.trim();
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    if (description !== undefined) update.description = (description || '').trim();
    if (location !== undefined) update.location = (location || '').trim();
    if (is_active !== undefined) update.is_active = !!is_active;

    const job = await LinkedInJob.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!job) return NextResponse.json({ error: 'LinkedIn job not found' }, { status: 404 });

    await logActivity(admin.id, 'linkedin_job_updated', 'linkedin_job', id, `Updated LinkedIn job "${job.title}"`);
    return NextResponse.json({ job });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = (await params).id;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const admin = requireAdmin(request);
    await dbConnect();

    const job = await LinkedInJob.findByIdAndDelete(id);
    if (!job) return NextResponse.json({ error: 'LinkedIn job not found' }, { status: 404 });

    await logActivity(admin.id, 'linkedin_job_deleted', 'linkedin_job', id, `Deleted LinkedIn job "${job.title}"`);
    return NextResponse.json({ message: 'LinkedIn job deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
