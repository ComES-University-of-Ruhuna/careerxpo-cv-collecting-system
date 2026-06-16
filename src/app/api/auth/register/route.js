import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { validateRegistrationNo, normalizeRegNo } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    await dbConnect();
    const { registration_no, password } = await request.json();

    if (!registration_no || !password) {
      return NextResponse.json({ error: 'Registration number and password are required' }, { status: 400 });
    }

    if (!validateRegistrationNo(registration_no)) {
      return NextResponse.json(
        { error: 'Invalid registration number. Must match format: EG/20XX/XXXX (e.g., EG/2021/1234)' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const regNo = normalizeRegNo(registration_no);
    const existing = await User.findOne({ registration_no: regNo });
    if (existing) {
      return NextResponse.json({ error: 'Registration number already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const defaultCredits = parseInt(process.env.DEFAULT_CREDITS || '100', 10);

    const user = await User.create({
      registration_no: regNo,
      password_hash,
      remaining_credits: defaultCredits,
      role: 'student',
    });

    const token = signToken({ id: user._id, registration_no: user.registration_no, role: user.role });

    const response = NextResponse.json({
      message: 'Registration successful',
      user: { id: user._id, registration_no: user.registration_no, role: user.role, remaining_credits: user.remaining_credits },
      token,
    }, { status: 201 });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
