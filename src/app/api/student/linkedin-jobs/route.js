import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedInJob from '@/models/LinkedInJob';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    requireAuth(request);
    await dbConnect();
    const jobs = await LinkedInJob.find({ is_active: true }).sort({ created_at: -1 });
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
