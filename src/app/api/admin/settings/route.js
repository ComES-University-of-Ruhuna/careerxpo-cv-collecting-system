import { NextResponse } from 'next/server';
import { requirePermission, ADMIN_PERMISSIONS } from '@/lib/auth';
import { getSettings, paymentSlipDepartmentsToObject } from '@/lib/settings';
import { DEPARTMENT_VALUES } from '@/lib/departments';
import { logActivity } from '@/lib/activity-log';

// GET /api/admin/settings — current global settings (payments permission)
export async function GET(request) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    const doc = await getSettings();
    return NextResponse.json({
      payment_slip_enabled: doc.payment_slip_enabled,
      payment_slip_departments: paymentSlipDepartmentsToObject(doc),
      updated_at: doc.updated_at,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update payment-slip toggles
// Body accepts either or both fields:
//   { payment_slip_enabled?: boolean,
//     payment_slip_departments?: { [DEPT]: boolean } }  // partial map
export async function PUT(request) {
  try {
    const admin = await requirePermission(request, ADMIN_PERMISSIONS.PAYMENTS);
    const body = await request.json().catch(() => ({}));

    const hasGlobal = typeof body.payment_slip_enabled === 'boolean';
    const hasDepartments =
      body.payment_slip_departments &&
      typeof body.payment_slip_departments === 'object' &&
      !Array.isArray(body.payment_slip_departments);

    if (!hasGlobal && !hasDepartments) {
      return NextResponse.json(
        { error: 'Provide payment_slip_enabled (boolean) or payment_slip_departments (object).' },
        { status: 400 }
      );
    }

    if (hasDepartments) {
      for (const [dept, value] of Object.entries(body.payment_slip_departments)) {
        if (!DEPARTMENT_VALUES.includes(dept)) {
          return NextResponse.json({ error: `Unknown department: ${dept}` }, { status: 400 });
        }
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { error: `payment_slip_departments.${dept} must be a boolean` },
            { status: 400 }
          );
        }
      }
    }

    const doc = await getSettings();
    if (!doc.payment_slip_departments) {
      doc.payment_slip_departments = new Map();
    }

    const globalChanged = hasGlobal && doc.payment_slip_enabled !== body.payment_slip_enabled;
    const deptChanges = [];
    if (hasDepartments) {
      for (const [dept, value] of Object.entries(body.payment_slip_departments)) {
        const prev = doc.payment_slip_departments.get(dept);
        const prevBool = prev === undefined ? true : !!prev;
        if (prevBool !== value) {
          doc.payment_slip_departments.set(dept, value);
          deptChanges.push({ dept, from: prevBool, to: value });
        }
      }
    }

    if (!globalChanged && deptChanges.length === 0) {
      return NextResponse.json({
        message: 'No change',
        payment_slip_enabled: doc.payment_slip_enabled,
        payment_slip_departments: paymentSlipDepartmentsToObject(doc),
      });
    }

    let previousGlobal = doc.payment_slip_enabled;
    if (globalChanged) {
      doc.payment_slip_enabled = body.payment_slip_enabled;
    }
    doc.updated_at = new Date();
    await doc.save();

    if (globalChanged) {
      await logActivity(
        admin.id,
        body.payment_slip_enabled ? 'payment_slip_uploads_enabled' : 'payment_slip_uploads_disabled',
        'student',
        'global',
        `Payment slip upload section ${previousGlobal ? 'was' : 'was not'} shown to students; now ${body.payment_slip_enabled ? 'shown' : 'hidden'}.`
      );
    }
    for (const change of deptChanges) {
      await logActivity(
        admin.id,
        change.to ? 'payment_slip_department_enabled' : 'payment_slip_department_disabled',
        'student',
        change.dept,
        `Payment slip uploads for ${change.dept} changed from ${change.from ? 'enabled' : 'disabled'} to ${change.to ? 'enabled' : 'disabled'}.`
      );
    }

    return NextResponse.json({
      message: 'Settings updated',
      payment_slip_enabled: doc.payment_slip_enabled,
      payment_slip_departments: paymentSlipDepartmentsToObject(doc),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

