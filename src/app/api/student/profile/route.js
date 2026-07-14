import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authenticate } from '@/lib/auth';
import { validateRegistrationNo, normalizeRegNo } from '@/lib/validation';
import {
  DEPARTMENT_VALUES,
  getSubSpecializations,
  isValidSubSpecialization,
} from '@/lib/departments';

export async function GET(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(decoded.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { registration_no, full_name, linkedin, department, sub_specialization, cv_consent } = await request.json();

    // Handle CV consent
    if (cv_consent !== undefined) {
      user.cv_consent = !!cv_consent;
      if (cv_consent && !user.cv_consent_at) {
        user.cv_consent_at = new Date();
      }
    }

    // Validate registration number if provided
    if (registration_no !== undefined && registration_no !== '') {
      if (!validateRegistrationNo(registration_no)) {
        return NextResponse.json(
          { error: 'Invalid registration number. Must match format: EG/20XX/XXXX (e.g., EG/2021/1234)' },
          { status: 400 }
        );
      }

      const regNo = normalizeRegNo(registration_no);

      // Check if reg_no is taken by another user
      if (regNo !== user.registration_no) {
        const existing = await User.findOne({ registration_no: regNo, _id: { $ne: user._id } });
        if (existing) {
          return NextResponse.json({ error: 'This registration number is already in use' }, { status: 409 });
        }
        user.registration_no = regNo;
      }
    }

    if (full_name !== undefined) {
      user.full_name = full_name.trim();
    }

    if (linkedin !== undefined) {
      user.linkedin = linkedin.trim();
    }

    const validDepartments = DEPARTMENT_VALUES;
    if (department !== undefined) {
      if (department && !validDepartments.includes(department)) {
        return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
      }
      user.department = department || null;
      // Reset sub_specialization when department changes and it's no longer valid.
      if (
        user.sub_specialization &&
        !isValidSubSpecialization(user.department, user.sub_specialization)
      ) {
        user.sub_specialization = null;
      }
    }

    if (sub_specialization !== undefined) {
      const targetDept = department !== undefined ? department : user.department;
      const options = getSubSpecializations(targetDept);
      if (sub_specialization === '' || sub_specialization == null) {
        // Allow clearing only if the department has no sub-specializations.
        if (options.length > 0) {
          return NextResponse.json(
            { error: 'Please select a sub-specialization for your department' },
            { status: 400 }
          );
        }
        user.sub_specialization = null;
      } else {
        if (!options.includes(sub_specialization)) {
          return NextResponse.json(
            { error: 'Invalid sub-specialization for the selected department' },
            { status: 400 }
          );
        }
        user.sub_specialization = sub_specialization;
      }
    }

    // Mark profile as completed if reg_no, full_name, department, and cv_consent are set.
    // Also require a sub_specialization when the department offers any.
    const subOptions = getSubSpecializations(user.department);
    const subOk = subOptions.length === 0 || !!user.sub_specialization;
    if (user.registration_no && user.full_name && user.department && subOk && user.cv_consent) {
      user.profile_completed = true;
    } else {
      user.profile_completed = false;
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password_hash;

    return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
