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

export function requireAdmin(request) {
  const user = requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

// Allows super-admin (role === 'admin') OR a sub-admin (student whose
// admin_permissions array contains the required permission key).
// DB lookup is required because permissions can change without a re-login.
// Model and DB are imported lazily so this module stays usable in unit tests
// that mock mongoose without loading models.
export async function requirePermission(request, permission) {
  const decoded = requireAuth(request);
  if (decoded.role === 'admin') return decoded;

  const [{ default: dbConnect }, { default: User }] = await Promise.all([
    import('@/lib/db'),
    import('@/models/User'),
  ]);
  await dbConnect();
  const user = await User.findById(decoded.id).select('role admin_permissions');
  if (!user) throw new Error('Unauthorized');
  if (user.role === 'admin') return decoded;
  if (Array.isArray(user.admin_permissions) && user.admin_permissions.includes(permission)) {
    return decoded;
  }
  throw new Error('Forbidden');
}
