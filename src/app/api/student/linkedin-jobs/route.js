import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedInJob from '@/models/LinkedInJob';
import { requireAuth } from '@/lib/auth';
import { cacheGetOrSet, CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET(request) {
  try {
    requireAuth(request);
    const jobs = await cacheGetOrSet(
      CacheKeys.studentLinkedInJobs(),
      CacheTTL.studentLinkedInJobs,
      async () => {
        await dbConnect();
        return LinkedInJob.find({ is_active: true }).sort({ created_at: -1 }).lean();
      }
    );
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
