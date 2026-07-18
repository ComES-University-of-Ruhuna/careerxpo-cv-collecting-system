// Departments and their sub-specializations.
// Shared between the profile UI and the profile API for validation.

export const DEPARTMENTS = [
  { value: 'DEIE', label: 'DEIE - Electrical & Information Engineering' },
  { value: 'DMME', label: 'DMME - Mechanical & Manufacturing Engineering' },
  { value: 'COM', label: 'COM - Computer Engineering' },
  { value: 'DCEE', label: 'DCEE - Civil & Environmental Engineering' },
  { value: 'DMENA', label: 'DMENA - Marine Engineering and Naval Architecture' },
];

export const SUB_SPECIALIZATIONS = {
  COM: [
    'Software Engineering',
    'Electronics and Embedded Systems',
    'AI and Data Science',
    'Network and Cybersecurity',
  ],
  DEIE: [
    'Electrical and Power Engineering',
    'Telecommunication Engineering',
    'Software Engineering',
    'Electronics Engineering',
  ],
  DMME: [],
  DCEE: [],
  DMENA: [],
};

export const DEPARTMENT_VALUES = DEPARTMENTS.map((d) => d.value);

export function getSubSpecializations(department) {
  if (!department) return [];
  return SUB_SPECIALIZATIONS[department] || [];
}

// Returns { valid, cleaned, error } for a sub-specialization selection.
// - Accepts an array (preferred) or a single string.
// - Deduplicates entries and preserves canonical order from SUB_SPECIALIZATIONS.
// - Ensures every entry belongs to the given department.
export function validateSubSpecializations(department, value) {
  const options = getSubSpecializations(department);

  let raw = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string' && value.length > 0) raw = [value];
  else if (value == null) raw = [];
  else return { valid: false, cleaned: [], error: 'Invalid sub-specialization value' };

  // Dedupe.
  const set = new Set(raw.filter((v) => typeof v === 'string' && v.length > 0));

  if (options.length === 0) {
    if (set.size > 0) {
      return {
        valid: false,
        cleaned: [],
        error: 'The selected department has no sub-specializations',
      };
    }
    return { valid: true, cleaned: [], error: null };
  }

  for (const entry of set) {
    if (!options.includes(entry)) {
      return {
        valid: false,
        cleaned: [],
        error: `Invalid sub-specialization "${entry}" for the selected department`,
      };
    }
  }

  // Preserve canonical order from the options list.
  const cleaned = options.filter((o) => set.has(o));
  return { valid: true, cleaned, error: null };
}

export function isValidSubSpecialization(department, value) {
  return validateSubSpecializations(department, value).valid;
}
