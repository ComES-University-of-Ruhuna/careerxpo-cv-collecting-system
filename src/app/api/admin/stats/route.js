import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Bid from '@/models/Bid';
import Company from '@/models/Company';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();

    const [totalStudents, studentsWithCV, bidsPerJob] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', cv_drive_id: { $ne: null } }),
      Bid.aggregate([
        { $group: { _id: '$job_id', total_bids: { $sum: 1 } } },
        { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
        { $unwind: '$job' },
        { $lookup: { from: 'companies', localField: 'job.company_id', foreignField: '_id', as: 'company' } },
        { $unwind: '$company' },
        { $project: { job_title: '$job.title', company_name: '$company.name', total_bids: 1 } },
        { $sort: { total_bids: -1 } },
      ]),
    ]);

    return NextResponse.json({
      total_students: totalStudents,
      total_cvs: studentsWithCV,
      bids_per_job: bidsPerJob,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
