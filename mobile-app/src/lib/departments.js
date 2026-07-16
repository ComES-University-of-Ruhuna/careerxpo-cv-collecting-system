// Keep this list in sync with src/lib/departments.js on the web app.
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
  DMME: ['Type A', 'Type B', 'Type C'],
  DCEE: [],
  DMENA: [],
};

export function getSubSpecializations(department) {
  if (!department) return [];
  return SUB_SPECIALIZATIONS[department] || [];
}
