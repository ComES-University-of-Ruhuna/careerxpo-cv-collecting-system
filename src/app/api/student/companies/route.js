import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    const companies = await Company.find().sort({ created_at: -1 });

    // Filter jobs: show jobs that include the student's department OR have no/empty departments (open to all)
    let jobFilter = {};
    if (department) {
      jobFilter = {
        $or: [
          { departments: department },
          { departments: { $exists: false } },
          { departments: { $size: 0 } },
        ],
      };
    }
    const jobs = await Job.find(jobFilter);

    const companiesWithJobs = companies
      .map((c) => ({
        ...c.toObject(),
        jobs: jobs
          .filter((j) => j.company_id?.toString() === c._id.toString())
          .map((j) => j.toObject()),
      }))
      .filter((c) => c.jobs.length > 0 || !department);

    return NextResponse.json({ companies: companiesWithJobs });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
