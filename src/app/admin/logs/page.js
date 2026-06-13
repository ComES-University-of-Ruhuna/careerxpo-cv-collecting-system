'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { HiFilter, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const ACTION_LABELS = {
  company_created: { label: 'Company Created', color: 'bg-green-100 text-green-700' },
  company_updated: { label: 'Company Updated', color: 'bg-blue-100 text-blue-700' },
  company_deleted: { label: 'Company Deleted', color: 'bg-red-100 text-red-700' },
  job_created: { label: 'Job Created', color: 'bg-green-100 text-green-700' },
  job_updated: { label: 'Job Updated', color: 'bg-blue-100 text-blue-700' },
  job_deleted: { label: 'Job Deleted', color: 'bg-red-100 text-red-700' },
  student_bids_reset: { label: 'Bids Reset', color: 'bg-amber-100 text-amber-700' },
  student_deleted: { label: 'Student Deleted', color: 'bg-red-100 text-red-700' },
  credits_added: { label: 'Credits Added', color: 'bg-purple-100 text-purple-700' },
  guest_post_approved: { label: 'Guest Post Approved', color: 'bg-teal-100 text-teal-700' },
  guest_post_rejected: { label: 'Guest Post Rejected', color: 'bg-orange-100 text-orange-700' },
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'company_created', label: 'Company Created' },
  { value: 'company_updated', label: 'Company Updated' },
  { value: 'company_deleted', label: 'Company Deleted' },
  { value: 'job_created', label: 'Job Created' },
  { value: 'job_updated', label: 'Job Updated' },
  { value: 'job_deleted', label: 'Job Deleted' },
  { value: 'student_bids_reset', label: 'Bids Reset' },
  { value: 'student_deleted', label: 'Student Deleted' },
  { value: 'credits_added', label: 'Credits Added' },
  { value: 'guest_post_approved', label: 'Guest Post Approved' },
  { value: 'guest_post_rejected', label: 'Guest Post Rejected' },
];

export default function AdminLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  async function fetchLogs(p = 1, action = '') {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 30 });
      if (action) params.set('action', action);

      const res = await fetch(`/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setLogs(data.logs || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1, filter);
  }, [token, filter]);

  function handleFilter(e) {
    setFilter(e.target.value);
  }

  function goPage(p) {
    if (p < 1 || p > pages) return;
    fetchLogs(p, filter);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total entries</p>
        </div>
        <div className="flex items-center gap-2">
          <HiFilter className="text-gray-400" />
          <select
            value={filter}
            onChange={handleFilter}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No activity logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={log._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-md truncate">{log.details || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.admin_id?.full_name || log.admin_id?.email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {page} of {pages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <HiChevronLeft />
                </button>
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <HiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
