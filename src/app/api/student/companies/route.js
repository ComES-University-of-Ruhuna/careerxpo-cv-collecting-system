import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import User from '@/models/User';
import { cacheGetOrSet, CacheKeys, CacheTTL } from '@/lib/cache';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Authenticated students only. Company/job listings include internal
    // fields (credit_cost, max_applicants, deadlines) that must not leak
    // to unauthenticated clients.
    const decoded = requireAuth(request);

    await dbConnect();
    const currentUser = await User.findById(decoded.id).select(
      'profile_completed payment_slip_url payment_slip_status'
    );
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!currentUser.profile_completed) {
      return NextResponse.json(
        {
          error: 'Please complete your profile before viewing job openings.',
          profile_completed: false,
          companies: [],
        },
        { status: 403 }
      );
    }
    // Vacancies are visible once a bank slip has been submitted — verification
    // is only required later at bid time.
    if (!currentUser.payment_slip_url) {
      return NextResponse.json(
        {
          error: 'Please submit your registration-fee bank slip to view published vacancies.',
          payment_submitted: false,
          companies: [],
        },
        { status: 403 }
      );
    }

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
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
