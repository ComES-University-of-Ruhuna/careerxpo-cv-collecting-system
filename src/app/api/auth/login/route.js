import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizeRegNo } from '@/lib/validation';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed, remaining } = await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    await dbConnect();
    const { registration_no, password } = await request.json();

    if (!registration_no || !password) {
      return NextResponse.json({ error: 'Registration number and password are required' }, { status: 400 });
    }

    const regNo = normalizeRegNo(registration_no);
    const user = await User.findOne({ registration_no: regNo });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      id: user._id,
      registration_no: user.registration_no,
      role: user.role,
      tv: user.token_version || 0,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user._id,
        registration_no: user.registration_no,
        role: user.role,
        remaining_credits: user.remaining_credits,
        cv_url: user.cv_url,
      },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
