import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import Bid from '@/models/Bid';

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

    // Get bid counts for jobs with max_applicants
    const jobsWithLimits = jobs.filter((j) => j.max_applicants);
    let bidCounts = {};
    if (jobsWithLimits.length > 0) {
      const counts = await Bid.aggregate([
        { $match: { job_id: { $in: jobsWithLimits.map((j) => j._id) } } },
        { $group: { _id: '$job_id', count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => { bidCounts[c._id.toString()] = c.count; });
    }

    const companiesWithJobs = companies
      .map((c) => ({
        ...c.toObject(),
        jobs: jobs
          .filter((j) => j.company_id?.toString() === c._id.toString())
          .map((j) => {
            const jObj = j.toObject();
            if (jObj.max_applicants) {
              jObj.current_applicants = bidCounts[jObj._id.toString()] || 0;
            }
            return jObj;
          }),
      }))
      .filter((c) => c.jobs.length > 0 || !department);

    return NextResponse.json({ companies: companiesWithJobs });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
