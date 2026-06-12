export const REG_NO_PATTERN = /^eg\/20\d{2}\/\d{4}$/i;

export function validateRegistrationNo(regNo) {
  return REG_NO_PATTERN.test(regNo);
}

export function normalizeRegNo(regNo) {
  return regNo.toUpperCase();
}
