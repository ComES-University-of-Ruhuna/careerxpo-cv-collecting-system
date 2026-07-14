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
    'Power and Energy',
    'Telecommunication and Networking',
    'Electrical',
    'Electronics',
  ],
  DMME: ['Type A', 'Type B', 'Type C'],
  DCEE: ['Type A', 'Type B', 'Type C'],
  DMENA: [],
};

export const DEPARTMENT_VALUES = DEPARTMENTS.map((d) => d.value);

export function getSubSpecializations(department) {
  if (!department) return [];
  return SUB_SPECIALIZATIONS[department] || [];
}

export function isValidSubSpecialization(department, subSpecialization) {
  const options = getSubSpecializations(department);
  if (options.length === 0) return subSpecialization === '' || subSpecialization == null;
  return options.includes(subSpecialization);
}
