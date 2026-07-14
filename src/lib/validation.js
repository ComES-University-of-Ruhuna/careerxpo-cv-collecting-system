export const REG_NO_PATTERN = /^eg\/20\d{2}\/\d{4}$/i;

export function validateRegistrationNo(regNo) {
  return REG_NO_PATTERN.test(regNo);
}

export function normalizeRegNo(regNo) {
  return regNo.toUpperCase();
}

// Restrict user-supplied URLs to http(s) only.
// Prevents javascript:, data:, file:, and other scheme-injection payloads
// from being persisted and later rendered as clickable links.
// Empty strings/undefined return true so callers can treat the URL as optional.
export function isValidUrl(str) {
  if (!str) return true;
  if (typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
