import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GuestPost from '@/models/GuestPost';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = 20;

    const filter = {};
    if (['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const [posts, total] = await Promise.all([
      GuestPost.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
      GuestPost.countDocuments(filter),
    ]);

    return NextResponse.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin guest posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
