import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { storeAuthCode } from '@/lib/auth-codes';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(new URL('/login?error=oauth_denied', request.url));
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.id || !googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    await dbConnect();

    // Find existing user by google_id or email
    let user = await User.findOne({
      $or: [{ google_id: googleUser.id }, { email: googleUser.email }],
    });

    const defaultCredits = parseInt(process.env.DEFAULT_CREDITS || '100', 10);

    if (!user) {
      // Create new student account
      user = await User.create({
        google_id: googleUser.id,
        email: googleUser.email,
        full_name: googleUser.name || '',
        avatar: googleUser.picture || '',
        role: 'student',
        remaining_credits: defaultCredits,
        profile_completed: false,
      });
    } else {
      // Update google_id and avatar if missing
      if (!user.google_id) user.google_id = googleUser.id;
      if (!user.avatar) user.avatar = googleUser.picture || '';
      if (!user.full_name && googleUser.name) user.full_name = googleUser.name;
      await user.save();
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      registration_no: user.registration_no,
      role: user.role,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectPath = user.role === 'admin' ? '/admin' : '/student';
    const authCode = storeAuthCode(token);
    const response = NextResponse.redirect(new URL(`${redirectPath}?code=${authCode}`, appUrl));

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
