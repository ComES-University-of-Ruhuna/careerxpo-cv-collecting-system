import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

// Google Sign-In endpoint for the Expo mobile app.
// The client obtains an ID token via `expo-auth-session` and posts it here.
// We verify the token against Google and issue our own JWT.
//
// POST /api/auth/mobile/google
// Body: { id_token: string }
// Response: { token, user }
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = String(body?.id_token || '').trim();
    if (!idToken) {
      return NextResponse.json({ error: 'id_token is required' }, { status: 400 });
    }

    // Accept ID tokens minted for any of our configured mobile / web OAuth
    // client IDs. Google signs each token with the audience baked in — we
    // must whitelist every client that ships in an app build.
    const audiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_MOBILE_WEB_CLIENT_ID,
      process.env.GOOGLE_MOBILE_IOS_CLIENT_ID,
      process.env.GOOGLE_MOBILE_ANDROID_CLIENT_ID,
    ].filter(Boolean);

    if (audiences.length === 0) {
      return NextResponse.json(
        { error: 'Server is missing Google OAuth client configuration' },
        { status: 500 }
      );
    }

    const client = new OAuth2Client();
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: audiences });
      payload = ticket.getPayload();
    } catch (err) {
      console.error('Google ID token verification failed:', err?.message || err);
      return NextResponse.json({ error: 'Invalid Google ID token' }, { status: 401 });
    }

    if (!payload?.sub || !payload?.email) {
      return NextResponse.json({ error: 'Google account missing email' }, { status: 400 });
    }
    if (payload.email_verified === false) {
      return NextResponse.json({ error: 'Google email is not verified' }, { status: 401 });
    }

    await dbConnect();

    // Mirror the web callback: find by google_id or email, otherwise create.
    let user = await User.findOne({
      $or: [{ google_id: payload.sub }, { email: payload.email }],
    });

    const defaultCredits = parseInt(process.env.DEFAULT_CREDITS || '100', 10);

    if (!user) {
      user = await User.create({
        google_id: payload.sub,
        email: payload.email,
        full_name: payload.name || '',
        avatar: payload.picture || '',
        role: 'student',
        remaining_credits: defaultCredits,
        profile_completed: false,
      });
    } else {
      let changed = false;
      if (!user.google_id) { user.google_id = payload.sub; changed = true; }
      if (!user.avatar && payload.picture) { user.avatar = payload.picture; changed = true; }
      if (!user.full_name && payload.name) { user.full_name = payload.name; changed = true; }
      if (changed) await user.save();
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      registration_no: user.registration_no,
      role: user.role,
      tv: user.token_version || 0,
    });

    // Return the JWT and a sanitized user object. No cookie is set — mobile
    // clients authenticate using the Bearer header on every request.
    const safeUser = user.toObject();
    delete safeUser.password_hash;

    return NextResponse.json({ token, user: safeUser });
  } catch (error) {
    console.error('Mobile Google sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
