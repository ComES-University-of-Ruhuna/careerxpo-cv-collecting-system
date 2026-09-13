'use client';

import { formatDateInput } from '@/lib/date-time';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiX, HiDownload, HiRefresh } from 'react-icons/hi';
import { DEPARTMENTS } from '@/lib/departments';
import {
  STUDENT_EXPORT_COLUMNS, DEFAULT_STUDENT_EXPORT_FIELDS,
  getStudentExportJobs, getStudentExportSelection, buildStudentWorkbook,
} from '@/lib/student-export';

function todayStamp() {
  return formatDateInput().replaceAll('-', '');
}

export default function ExportStudentsModal({ open, onClose, token }) {
  const [department, setDepartment] = useState('');
  const [format, setFormat] = useState('xlsx');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [fields, setFields] = useState(DEFAULT_STUDENT_EXPORT_FIELDS);
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [includeApplications, setIncludeApplications] = useState(true);

  useEffect(() => {
    if (open) {
      setDepartment('');
      setFormat('xlsx');
      setBusy(false);
      setFields(DEFAULT_STUDENT_EXPORT_FIELDS);
      setCompanyId('');
      setJobId('');
      setIncludeApplications(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    async function loadStudents() {
      try {
        if (!token) throw new Error('Not authenticated.');
        const params = new URLSearchParams({ export: '1', sort: 'name' });
        if (department) params.set('department', department);
        const response = await fetch(`/api/admin/students?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load students.');
        if (controller.signal.aborted) return;
        setStudents(data.students || []);
        setJobs(getStudentExportJobs(data.students || [], data.jobs || []));
        setCompanyId('');
        setJobId('');
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Failed to load students.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadStudents();
    return () => controller.abort();
  }, [open, token, department, retry]);

  const fileBase = useMemo(
    () => ['students', department || 'all-depts', todayStamp()].join('_'),
    [department]
  );

  if (!open) return null;

  const columns = STUDENT_EXPORT_COLUMNS.filter((column) => fields.includes(column.key));
  const { companies, companyJobs, includedJobs: matchingJobs, exportStudents } = getStudentExportSelection(students, jobs, companyId, jobId);
  const includedJobs = includeApplications ? matchingJobs : [];
  const columnCount = columns.length + includedJobs.length;

  function toggleField(key) {
    setFields((current) => current.includes(key) ? current.filter((field) => field !== key) : [...current, key]);
  }

  async function handleExport() {
    if (!token) {
      toast.error('Not authenticated.');
      return;
    }
    if (busy || loading || error || !exportStudents.length || !columnCount) return;
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = buildStudentWorkbook(XLSX, exportStudents, columns, includedJobs, format);
      XLSX.writeFile(workbook, `${fileBase}.${format}`, { bookType: format });
      toast.success(`Exported ${exportStudents.length} student${exportStudents.length === 1 ? '' : 's'}.`);
      onClose?.();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="student-export-title" className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90dvh] flex flex-col min-h-0">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <h2 id="student-export-title" className="text-lg font-semibold text-gray-900">Export Students</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
            title="Close"
          >
            <HiX className="text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <div>
            <label htmlFor="student-export-department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              id="student-export-department"
              value={department}
              onChange={(event) => { setDepartment(event.target.value); setLoading(true); }}
              disabled={busy}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">File format</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'xlsx', label: 'Excel (.xlsx)' },
                { value: 'csv', label: 'CSV (.csv)' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${
                    format === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="student-export-format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    disabled={busy}
                    className="accent-primary-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <fieldset disabled={busy}>
            <legend className="text-sm font-semibold text-gray-900 mb-3">Student details</legend>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-x-4 gap-y-2">
              {STUDENT_EXPORT_COLUMNS.map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                  <input type="checkbox" checked={fields.includes(column.key)} onChange={() => toggleField(column.key)} className="accent-primary-600 h-4 w-4 shrink-0" />
                  {column.header}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={busy || loading || !!error} className="border-t border-gray-200 pt-4 min-w-0">
            <legend className="text-sm font-semibold text-gray-900 pr-2">Applications</legend>
            {loading ? <p role="status" className="text-sm text-gray-500">Loading students and openings...</p> : error ? (
              <p role="alert" className="text-sm text-red-700">{error}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="min-w-0">
                    <label htmlFor="student-export-company" className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      id="student-export-company"
                      value={companyId}
                      onChange={(event) => { setCompanyId(event.target.value); setJobId(''); }}
                      className="w-full min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">All companies</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="student-export-vacancy" className="block text-sm font-medium text-gray-700 mb-1">Job vacancy</label>
                    <select
                      id="student-export-vacancy"
                      value={jobId}
                      onChange={(event) => setJobId(event.target.value)}
                      className="w-full min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">All job openings</option>
                      {companyJobs.map((job) => (
                        <option key={job._id} value={job._id}>{job.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={includeApplications} onChange={(event) => setIncludeApplications(event.target.checked)} className="accent-primary-600 h-4 w-4 shrink-0" />
                  Include job application columns
                </label>
                {!companyJobs.length && <p className="text-sm text-gray-500 mt-2">No job openings.</p>}
                {!exportStudents.length && <p className="text-sm text-gray-500 mt-2">No matching students.</p>}
              </>
            )}
          </fieldset>
          {error && <button type="button" onClick={() => setRetry((current) => current + 1)} className="inline-flex items-center gap-2 text-sm text-primary-700"><HiRefresh /> Retry</button>}
          {!loading && !error && <p role="status" className="text-sm text-gray-500">{exportStudents.length} students · {columnCount} columns</p>}
          {!columnCount && <p role="alert" className="text-sm text-red-600">Select at least one column.</p>}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || loading || !!error || !exportStudents.length || !columnCount}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <HiDownload />
            {busy ? 'Exporting…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
