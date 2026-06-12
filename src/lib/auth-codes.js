import crypto from 'crypto';

// Shared in-memory store for short-lived auth codes
const authCodes = new Map();

export function storeAuthCode(token) {
  const code = crypto.randomBytes(32).toString('hex');
  authCodes.set(code, { token, expiresAt: Date.now() + 5 * 60 * 1000 });
  // Cleanup expired codes
  for (const [key, val] of authCodes) {
    if (Date.now() > val.expiresAt) authCodes.delete(key);
  }
  return code;
}

export function consumeAuthCode(code) {
  const entry = authCodes.get(code);
  if (!entry) return null;
  authCodes.delete(code);
  if (Date.now() > entry.expiresAt) return null;
  return entry.token;
}
