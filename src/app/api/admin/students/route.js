import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Bid from '@/models/Bid';
import { requirePermission, ADMIN_PERMISSIONS } from '@/lib/auth';

export async function GET(request) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.STUDENTS);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ students: [] });
    }

    // Escape regex special characters to prevent ReDoS
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const students = await User.find({
      role: 'student',
      $or: [
        { full_name: { $regex: escaped, $options: 'i' } },
        { registration_no: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('-password_hash')
      .limit(20)
      .sort({ created_at: -1 });

    return NextResponse.json({ students });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
