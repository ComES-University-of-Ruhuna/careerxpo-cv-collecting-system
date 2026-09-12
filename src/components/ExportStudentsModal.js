'use client';

import { formatDateInput } from '@/lib/date-time';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiX, HiDownload, HiRefresh } from 'react-icons/hi';
import { DEPARTMENTS } from '@/lib/departments';
import {
  STUDENT_EXPORT_COLUMNS, DEFAULT_STUDENT_EXPORT_FIELDS,
  getStudentExportJobs, buildStudentWorkbook,
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
  const [selectedJobs, setSelectedJobs] = useState(null);
  const [jobQuery, setJobQuery] = useState('');

  useEffect(() => {
    if (open) {
      setDepartment('');
      setFormat('xlsx');
      setBusy(false);
      setFields(DEFAULT_STUDENT_EXPORT_FIELDS);
      setSelectedJobs(null);
      setJobQuery('');
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
        setSelectedJobs(null);
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
  const includedJobs = selectedJobs === null ? jobs : jobs.filter((job) => selectedJobs.includes(job._id));
  const visibleJobs = jobs.filter((job) => job.label.toLowerCase().includes(jobQuery.toLowerCase()));
  const columnCount = columns.length + includedJobs.length;

  function toggleField(key) {
    setFields((current) => current.includes(key) ? current.filter((field) => field !== key) : [...current, key]);
  }

  function toggleJob(id) {
    setSelectedJobs((current) => {
      const selected = current === null ? jobs.map((job) => job._id) : current;
      return selected.includes(id) ? selected.filter((jobId) => jobId !== id) : [...selected, id];
    });
  }

  async function handleExport() {
    if (!token) {
      toast.error('Not authenticated.');
      return;
    }
    if (busy || loading || error || !students.length || !columnCount) return;
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = buildStudentWorkbook(XLSX, students, columns, includedJobs, format);
      XLSX.writeFile(workbook, `${fileBase}.${format}`, { bookType: format });
      toast.success(`Exported ${students.length} student${students.length === 1 ? '' : 's'}.`);
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
            <legend className="text-sm font-semibold text-gray-900 pr-2">Job application columns</legend>
            {loading ? <p role="status" className="text-sm text-gray-500">Loading students and openings...</p> : error ? (
              <p role="alert" className="text-sm text-red-700">{error}</p>
            ) : jobs.length === 0 ? <p className="text-sm text-gray-500">No job openings.</p> : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={includedJobs.length === jobs.length} ref={(input) => { if (input) input.indeterminate = includedJobs.length > 0 && includedJobs.length < jobs.length; }} onChange={(event) => setSelectedJobs(event.target.checked ? null : [])} className="accent-primary-600 h-4 w-4" />
                    All openings ({includedJobs.length}/{jobs.length})
                  </label>
                  <input type="search" aria-label="Search job openings" placeholder="Search openings" value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-60" />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {visibleJobs.map((job) => (
                    <label key={job._id} className="flex items-start gap-2 py-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={selectedJobs === null || selectedJobs.includes(job._id)} onChange={() => toggleJob(job._id)} className="accent-primary-600 h-4 w-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">{job.label}</span>
                    </label>
                  ))}
                  {!visibleJobs.length && <p className="text-sm text-gray-500 py-2">No matching openings.</p>}
                </div>
              </>
            )}
          </fieldset>
          {error && <button type="button" onClick={() => setRetry((current) => current + 1)} className="inline-flex items-center gap-2 text-sm text-primary-700"><HiRefresh /> Retry</button>}
          {!loading && !error && <p role="status" className="text-sm text-gray-500">{students.length} students · {columnCount} columns</p>}
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
            disabled={busy || loading || !!error || !students.length || !columnCount}
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
