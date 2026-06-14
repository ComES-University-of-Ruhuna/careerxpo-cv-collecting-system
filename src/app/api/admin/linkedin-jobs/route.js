import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedInJob from '@/models/LinkedInJob';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();
    const jobs = await LinkedInJob.find().sort({ created_at: -1 });
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

    const { title, company_name, linkedin_url, description, location } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > 300) {
      return NextResponse.json({ error: 'Title is too long' }, { status: 400 });
    }
    if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (company_name.length > 200) {
      return NextResponse.json({ error: 'Company name is too long' }, { status: 400 });
    }
    if (!linkedin_url || typeof linkedin_url !== 'string' || linkedin_url.trim().length === 0) {
      return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
    }

    // Validate LinkedIn URL format
    try {
      const url = new URL(linkedin_url);
      if (!url.hostname.endsWith('linkedin.com')) {
        return NextResponse.json({ error: 'URL must be a valid LinkedIn link' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (description && description.length > 5000) {
      return NextResponse.json({ error: 'Description is too long' }, { status: 400 });
    }
    if (location && location.length > 200) {
      return NextResponse.json({ error: 'Location is too long' }, { status: 400 });
    }

    const job = await LinkedInJob.create({
      title: title.trim(),
      company_name: company_name.trim(),
      linkedin_url: linkedin_url.trim(),
      description: description?.trim() || '',
      location: location?.trim() || '',
      created_by: admin.id,
    });

    await logActivity(admin.id, 'linkedin_job_created', 'linkedin_job', job._id, `Published LinkedIn job "${title}"`);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
