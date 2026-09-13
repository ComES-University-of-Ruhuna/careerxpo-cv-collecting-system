import { formatDateTime } from '@/lib/date-time';

export const STUDENT_EXPORT_COLUMNS = [
  { key: 'full_name', header: 'Full Name', get: (student) => student.full_name || '' },
  { key: 'registration_no', header: 'Registration No', get: (student) => student.registration_no || '' },
  { key: 'email', header: 'Email', get: (student) => student.email || '' },
  { key: 'phone', header: 'Contact No (WhatsApp)', get: (student) => student.phone || '' },
  { key: 'department', header: 'Department', get: (student) => student.department || '' },
  { key: 'sub_specialization', header: 'Sub-specializations', get: (student) => Array.isArray(student.sub_specialization) ? student.sub_specialization.join(', ') : '' },
  { key: 'linkedin', header: 'LinkedIn', get: (student) => student.linkedin || '' },
  { key: 'remaining_credits', header: 'Credits', get: (student) => student.remaining_credits ?? 0 },
  { key: 'bids_count', header: 'Bids', get: (student) => student.bids_count ?? 0 },
  { key: 'profile_completed', header: 'Profile Completed', get: (student) => student.profile_completed ? 'Yes' : 'No' },
  { key: 'cv_url', header: 'CV URL', get: (student) => student.cv_url || '' },
  { key: 'payment_slip_status', header: 'Payment Status', get: (student) => student.payment_slip_status || 'none' },
  { key: 'payment_slip_uploaded_at', header: 'Payment Submitted At', get: (student) => student.payment_slip_uploaded_at ? formatDateTime(student.payment_slip_uploaded_at) : '' },
  { key: 'created_at', header: 'Registered At', get: (student) => student.created_at ? formatDateTime(student.created_at) : '' },
];

export const DEFAULT_STUDENT_EXPORT_FIELDS = ['full_name', 'registration_no', 'email', 'phone'];

export function getStudentExportJobs(students, jobs) {
  const openings = new Map(jobs.map((job) => [String(job._id), { ...job, _id: String(job._id) }]));
  for (const student of students) {
    for (const jobId of student.bid_job_ids || []) {
      const id = String(jobId);
      if (!openings.has(id)) {
        openings.set(id, { _id: id, title: 'Unavailable opening', company_name: 'Unknown company' });
      }
    }
  }
  const labels = new Map();
  for (const job of openings.values()) {
    const label = `${job.company_name} - ${job.title}`;
    labels.set(label, (labels.get(label) || 0) + 1);
  }
  return Array.from(openings.values(), (job) => {
    const label = `${job.company_name} - ${job.title}`;
    return { ...job, company_id: job.company_id ? String(job.company_id) : 'unknown', label: labels.get(label) > 1 || job.title === 'Unavailable opening' ? `${label} [${job._id}]` : label };
  });
}

export function filterStudentExportStudents(students, selectedJobIds) {
  if (selectedJobIds == null) return students;
  const jobIds = new Set(selectedJobIds.map(String));
  return students.filter((student) => (student.bid_job_ids || []).some((jobId) => jobIds.has(String(jobId))));
}

export function getStudentExportSelection(students, jobs, companyId = '', jobId = '') {
  const companies = Array.from(new Map(jobs.map((job) => [job.company_id, {
    _id: job.company_id, name: job.company_name,
  }])).values()).sort((first, second) => first.name.localeCompare(second.name));
  const companyJobs = companyId ? jobs.filter((job) => job.company_id === companyId) : jobs;
  const includedJobs = jobId ? companyJobs.filter((job) => job._id === jobId) : companyJobs;
  const exportStudents = filterStudentExportStudents(students,
    companyId || jobId ? includedJobs.map((job) => job._id) : null);
  return { companies, companyJobs, includedJobs, exportStudents };
}

export function buildStudentWorkbook(XLSX, students, columns, jobs, format = 'xlsx') {
  if (!columns.length && !jobs.length) throw new Error('Select at least one column.');
  const headers = [...columns.map((column) => column.header), ...jobs.map((job) => `Applied: ${job.label}`)];
  const rows = students.map((student) => {
    const bids = new Set((student.bid_job_ids || []).map(String));
    return [...columns.map((column) => column.get(student)), ...jobs.map((job) => bids.has(String(job._id)) ? 'Yes' : 'No')];
  });
  const values = [headers, ...rows].map((row) => row.map((value) => (
    format === 'csv' && typeof value === 'string' && /^(\s*[=+@-]|[\t\r\n])/.test(value) ? `'${value}` : value
  )));
  const sheet = XLSX.utils.aoa_to_sheet(values);
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: students.length, c: headers.length - 1 }) };
  sheet['!cols'] = headers.map((header, index) => ({
    wch: Math.min(60, values.reduce((width, row) => Math.max(width, String(row[index] ?? '').length + 2), 12)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  return workbook;
}