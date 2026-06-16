import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { cacheGetOrSet, CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    const companiesWithJobs = await cacheGetOrSet(
      CacheKeys.studentCompanies(department),
      CacheTTL.studentCompanies,
      async () => {
        await dbConnect();
        const companies = await Company.find().sort({ created_at: -1 }).lean();

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
        const jobs = await Job.find(jobFilter).lean();

        return companies
          .map((c) => ({
            ...c,
            jobs: jobs.filter((j) => j.company_id?.toString() === c._id.toString()),
          }))
          .filter((c) => c.jobs.length > 0 || !department);
      }
    );

    return NextResponse.json({ companies: companiesWithJobs });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
