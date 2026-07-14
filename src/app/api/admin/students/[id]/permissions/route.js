import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin, isValidObjectId, ADMIN_PERMISSION_LIST } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// Update the admin_permissions array for a student.
// Only super-admin (role === 'admin') may grant or revoke permissions.
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const admin = await requireAdmin(request);
    await dbConnect();

    const body = await request.json();
    const requested = Array.isArray(body?.permissions) ? body.permissions : null;
    if (!requested) {
      return NextResponse.json({ error: 'permissions must be an array' }, { status: 400 });
    }

    // Deduplicate and validate against allow-list
    const cleaned = [...new Set(requested.map((p) => String(p).trim()))];
    const invalid = cleaned.filter((p) => !ADMIN_PERMISSION_LIST.includes(p));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid permission(s): ${invalid.join(', ')}` }, { status: 400 });
    }

    const user = await User.findById(id).select('full_name email role admin_permissions token_version');
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const previous = Array.isArray(user.admin_permissions) ? [...user.admin_permissions] : [];
    user.admin_permissions = cleaned;
    // Invalidate any outstanding JWTs for this user — the next request
    // carrying the old token will fail the token_version check in
    // requireAdmin / requirePermission and be forced to re-authenticate.
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    const summary = cleaned.length === 0 ? 'cleared all admin permissions' : `set admin permissions to [${cleaned.join(', ')}]`;
    await logActivity(
      admin.id,
      'student_permissions_updated',
      'student',
      id,
      `Updated "${user.full_name || user.email}" — ${summary} (previous: [${previous.join(', ') || 'none'}])`,
    );

    return NextResponse.json({
      message: 'Permissions updated',
      admin_permissions: cleaned,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Update permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
