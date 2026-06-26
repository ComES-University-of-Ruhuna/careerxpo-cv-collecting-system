import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import { requirePermission, isValidObjectId, ADMIN_PERMISSIONS } from '@/lib/auth';
import { getJobFolderLink } from '@/lib/google-drive';

export async function GET(request, { params }) {
  try {
    const id = (await params).id;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    await requirePermission(request, ADMIN_PERMISSIONS.JOBS);
    await dbConnect();

    const job = await Job.findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const company = await Company.findById(job.company_id);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const folderLink = await getJobFolderLink(company.name, job.title);

    if (!folderLink) {
      return NextResponse.json({ error: 'No CV folder found for this job position. CVs may not have been uploaded yet.' }, { status: 404 });
    }

    return NextResponse.json({ folder_url: folderLink });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drive folder error:', error);
    return NextResponse.json({ error: 'Failed to get Drive folder link' }, { status: 500 });
  }
}
