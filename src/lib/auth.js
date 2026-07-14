import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const ADMIN_PERMISSIONS = Object.freeze({
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  JOBS: 'jobs',
  LINKEDIN_JOBS: 'linkedin-jobs',
  GUEST_POSTS: 'guest-posts',
  STUDENTS: 'students',
  LOGS: 'logs',
});

export const ADMIN_PERMISSION_LIST = Object.values(ADMIN_PERMISSIONS);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  // Try Bearer token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    // Validate it's a real JWT before returning
    if (bearerToken.includes('.')) return bearerToken;
  }
  // Fall back to httpOnly cookie
  const cookie = request.cookies?.get('token');
  return cookie?.value || null;
}

export function authenticate(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(request) {
  const user = authenticate(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Look up the user in the DB and enforce that the JWT's token_version
// still matches. This is how we cut off an outstanding admin session when
// a role is downgraded or permissions are revoked before the JWT expires.
// Returns the fresh User document (with role + admin_permissions selected).
async function loadCurrentUser(decoded) {
  const [{ default: dbConnect }, { default: User }] = await Promise.all([
    import('@/lib/db'),
    import('@/models/User'),
  ]);
  await dbConnect();
  const user = await User.findById(decoded.id).select('role admin_permissions token_version');
  if (!user) throw new Error('Unauthorized');
  // Tokens issued before we started stamping token_version have no `tv`
  // claim. Treat that as version 0 so legacy sessions stay valid until
  // the next role/permission change bumps the counter.
  const claimed = typeof decoded.tv === 'number' ? decoded.tv : 0;
  if ((user.token_version || 0) !== claimed) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(request) {
  const decoded = requireAuth(request);
  if (decoded.role !== 'admin') {
    throw new Error('Forbidden');
  }
  // Verify the role is still 'admin' in the DB and the token has not been
  // invalidated by a version bump. Trusting the JWT alone would keep a
  // demoted admin's session alive for up to 7 days.
  const user = await loadCurrentUser(decoded);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return decoded;
}

// Allows super-admin (role === 'admin') OR a sub-admin (student whose
// admin_permissions array contains the required permission key).
// DB lookup is required because permissions can change without a re-login.
// Model and DB are imported lazily so this module stays usable in unit tests
// that mock mongoose without loading models.
export async function requirePermission(request, permission) {
  const decoded = requireAuth(request);
  const user = await loadCurrentUser(decoded);
  if (user.role === 'admin') return decoded;
  if (Array.isArray(user.admin_permissions) && user.admin_permissions.includes(permission)) {
    return decoded;
  }
  throw new Error('Forbidden');
}
