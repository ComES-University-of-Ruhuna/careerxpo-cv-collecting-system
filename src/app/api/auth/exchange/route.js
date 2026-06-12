import { NextResponse } from 'next/server';
import { consumeAuthCode } from '@/lib/auth-codes';

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const token = consumeAuthCode(code);
    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    const response = NextResponse.json({ token });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
