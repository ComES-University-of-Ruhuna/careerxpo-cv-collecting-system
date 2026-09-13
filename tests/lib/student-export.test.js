import * as XLSX from 'xlsx';
import { STUDENT_EXPORT_COLUMNS, DEFAULT_STUDENT_EXPORT_FIELDS, getStudentExportJobs, getStudentExportSelection, filterStudentExportStudents, buildStudentWorkbook } from '../../src/lib/student-export';

const students = [
  { full_name: 'Alex, "A"', registration_no: '00123', email: 'alex@example.com', phone: '0771234567', bid_job_ids: ['job1', 'job2'] },
  { full_name: 'Sam', registration_no: '00124', email: 'sam@example.com', phone: '+94771234567', bid_job_ids: [] },
];
const jobs = getStudentExportJobs(students, [
  { _id: 'job1', title: 'Engineer', company_id: 'company1', company_name: 'Acme' },
  { _id: 'job2', title: 'Engineer', company_id: 'company2', company_name: 'Other company' },
]);
const columns = STUDENT_EXPORT_COLUMNS.filter((column) => DEFAULT_STUDENT_EXPORT_FIELDS.includes(column.key));

describe('student spreadsheet export', () => {
  it.each(['xlsx', 'csv'])('exports only applicants to selected company vacancies in %s', (format) => {
    const applicants = [
      ...students,
      { full_name: 'Other company only', bid_job_ids: ['job2'] },
      { full_name: 'Different vacancy', bid_job_ids: ['job3'] },
      { full_name: 'Missing applications' },
    ];
    const filtered = filterStudentExportStudents(applicants, ['job1']);
    const workbook = buildStudentWorkbook(XLSX, filtered, [columns[0]], [jobs[0]], format);
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: format });
    const parsed = XLSX.read(bytes, { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], { header: 1 })).toEqual([
      ['Full Name', 'Applied: Acme - Engineer'],
      ['Alex, "A"', 'Yes'],
    ]);
    expect(workbook.Sheets.Students['!autofilter'].ref).toBe('A1:B2');
  });

  it('includes applicants to any selected opening without duplicate rows', () => {
    const applicants = [...students, { full_name: 'Other applicant', bid_job_ids: ['job2'] }];
    expect(filterStudentExportStudents(applicants, ['job1', 'job2'])).toEqual([applicants[0], applicants[2]]);
  });

  it('preserves all-student and detail-only exports', () => {
    expect(filterStudentExportStudents(students, null)).toEqual(students);
    expect(buildStudentWorkbook(XLSX, filterStudentExportStudents(students, null), columns, []).Sheets.Students['!ref']).toBe('A1:D3');
  });

  it('does not export all students for an empty set of matching vacancies', () => {
    expect(filterStudentExportStudents(students, [])).toEqual([]);
  });

  it('offers only the selected company vacancies and exports applicants across all of them', () => {
    const openings = getStudentExportJobs(students, [...jobs, {
      _id: 'job3', title: 'Designer', company_id: 'company1', company_name: 'Acme',
    }]);
    const applicants = [...students, { full_name: 'Designer', bid_job_ids: ['job3'] }, { full_name: 'Other', bid_job_ids: ['job2'] }];
    const selection = getStudentExportSelection(applicants, openings, 'company1');
    expect(selection.companies).toEqual([{ _id: 'company1', name: 'Acme' }, { _id: 'company2', name: 'Other company' }]);
    expect(selection.companyJobs.map((job) => job._id)).toEqual(['job1', 'job3']);
    expect(selection.includedJobs).toEqual(selection.companyJobs);
    expect(selection.exportStudents).toEqual([applicants[0], applicants[2]]);
    const singleVacancy = getStudentExportSelection(applicants, openings, 'company1', 'job3');
    expect(singleVacancy.includedJobs.map((job) => job._id)).toEqual(['job3']);
    expect(singleVacancy.exportStudents).toEqual([applicants[2]]);
  });

  it('supports all companies and all openings or a single vacancy', () => {
    expect(getStudentExportSelection(students, jobs)).toEqual({
      companies: [{ _id: 'company1', name: 'Acme' }, { _id: 'company2', name: 'Other company' }],
      companyJobs: jobs, includedJobs: jobs, exportStudents: students,
    });
    expect(getStudentExportSelection(students, jobs, '', 'job1').exportStudents).toEqual([students[0]]);
  });

  it('does not broaden invalid or mismatched company/vacancy selections', () => {
    expect(getStudentExportSelection(students, jobs, 'company1', 'job2').exportStudents).toEqual([]);
    expect(getStudentExportSelection(students, jobs, 'missing-company').exportStudents).toEqual([]);
  });

  it('keeps companies with identical names separate by ID', () => {
    const openings = getStudentExportJobs(students, jobs.map((job) => ({ ...job, company_name: 'Acme' })));
    const selection = getStudentExportSelection(students, openings, 'company2');
    expect(selection.companies).toHaveLength(2);
    expect(selection.companyJobs.map((job) => job._id)).toEqual(['job2']);
  });

  it('returns no students when the selected vacancy has no applicants', () => {
    expect(filterStudentExportStudents(students, ['unapplied-job'])).toEqual([]);
  });

  it('keeps one row per student with independently filterable application columns', () => {
    const workbook = buildStudentWorkbook(XLSX, students, columns, jobs);
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const sheet = XLSX.read(bytes, { type: 'buffer' }).Sheets.Students;
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })).toEqual([
      ['Full Name', 'Registration No', 'Email', 'Contact No (WhatsApp)', 'Applied: Acme - Engineer', 'Applied: Other company - Engineer'],
      ['Alex, "A"', '00123', 'alex@example.com', '0771234567', 'Yes', 'Yes'],
      ['Sam', '00124', 'sam@example.com', '+94771234567', 'No', 'No'],
    ]);
    expect(sheet['!autofilter']).toEqual({ ref: 'A1:F3' });
    expect(sheet.B2.t).toBe('s');
    expect(sheet.D3.f).toBeUndefined();
  });

  it('exports only selected fields and openings', () => {
    const sheet = buildStudentWorkbook(XLSX, students, [columns[0]], [jobs[1]]).Sheets.Students;
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]).toEqual(['Full Name', 'Applied: Other company - Engineer']);
    expect(sheet['!autofilter'].ref).toBe('A1:B3');
  });

  it('allows detail-only exports and rejects an empty column selection', () => {
    expect(buildStudentWorkbook(XLSX, students, columns, []).Sheets.Students['!ref']).toBe('A1:D3');
    expect(() => buildStudentWorkbook(XLSX, students, [], [])).toThrow('Select at least one column');
  });

  it('escapes CSV text and neutralizes spreadsheet formulas', () => {
    const unsafe = [...students, { full_name: '=HYPERLINK("bad")', phone: '\t=1+1' }];
    const sheet = buildStudentWorkbook(XLSX, unsafe, columns, jobs, 'csv').Sheets.Students;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const parsed = XLSX.utils.sheet_to_json(XLSX.read(csv, { type: 'string', raw: true }).Sheets.Sheet1, { header: 1 });
    expect(parsed[1][0]).toBe('Alex, "A"');
    expect(parsed[1][1]).toBe('00123');
    expect(parsed[2][3]).toBe("'+94771234567");
    expect(parsed[3][0]).toBe('\'=HYPERLINK("bad")');
    expect(parsed[3][3]).toBe("'\t=1+1");
  });

  it('distinguishes identical titles at the same company and retains unavailable openings', () => {
    const openings = getStudentExportJobs([{ bid_job_ids: ['deleted'] }], [
      { _id: 'job1', title: 'Engineer', company_name: 'Acme' },
      { _id: 'job2', title: 'Engineer', company_name: 'Acme' },
    ]);
    expect(openings.map((job) => job.label)).toEqual([
      'Acme - Engineer [job1]', 'Acme - Engineer [job2]', 'Unknown company - Unavailable opening [deleted]',
    ]);
  });
});