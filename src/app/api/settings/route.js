import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import {
  getSettings,
  isPaymentSlipEnabledForDepartment,
  paymentSlipDepartmentsToObject,
} from '@/lib/settings';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET /api/settings
// Exposes the subset of settings that authenticated users (students, admins)
// need to render their UI. Requires a valid session but no special permission.
export async function GET(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = await getSettings();

    // For students, resolve the effective toggle for their department so the
    // client can hide the upload section when either global or their dept is off.
    let effective = doc.payment_slip_enabled;
    if (decoded.role === 'student') {
      await dbConnect();
      const user = await User.findById(decoded.id).select('department');
      effective = isPaymentSlipEnabledForDepartment(doc, user?.department);
    }

    return NextResponse.json({
      payment_slip_enabled: doc.payment_slip_enabled,
      payment_slip_departments: paymentSlipDepartmentsToObject(doc),
      payment_slip_enabled_for_me: effective,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

