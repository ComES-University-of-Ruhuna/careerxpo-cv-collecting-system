import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/admins
// Super-admin only. Returns every account that currently has admin capabilities:
// - super admins (role === 'admin')
// - sub-admins (role === 'student' with admin_permissions.length > 0)
export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();

    const users = await User.find({
      $or: [
        { role: 'admin' },
        { role: 'student', admin_permissions: { $exists: true, $ne: [] } },
      ],
    })
      .select('full_name email registration_no avatar role admin_permissions department created_at')
      .sort({ role: 1, full_name: 1 });

    return NextResponse.json({ admins: users });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('List admins error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
