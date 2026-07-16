'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiSearch,
  HiExternalLink,
  HiCheck,
  HiX,
  HiRefresh,
  HiCash,
  HiClock,
  HiCheckCircle,
  HiXCircle,
} from 'react-icons/hi';
import { DEPARTMENTS } from '@/lib/departments';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: <HiClock /> },
  { key: 'verified', label: 'Verified', icon: <HiCheckCircle /> },
  { key: 'rejected', label: 'Rejected', icon: <HiXCircle /> },
  { key: 'all', label: 'All', icon: <HiCash /> },
];

const STATUS_STYLES = {
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  none: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function AdminPaymentsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState('pending');
  const [department, setDepartment] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  // Global toggle — whether students see the payment slip upload section.
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);

  async function fetchSettings() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setUploadsEnabled(!!data.payment_slip_enabled);
    } catch {}
  }

  async function toggleUploads(next) {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payment_slip_enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update setting');
        return;
      }
      setUploadsEnabled(!!data.payment_slip_enabled);
      toast.success(next ? 'Payment slip uploads enabled for students' : 'Payment slip uploads disabled for students');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setToggling(false);
    }
  }

  async function fetchSubmissions() {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      if (department) params.set('department', department);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (query.trim().length >= 2) params.set('q', query.trim());
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load payments');
        setSubmissions([]);
        return;
      }
      setSubmissions(data.submissions || []);
      setCounts(data.counts || { pending: 0, verified: 0, rejected: 0 });
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubmissions();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, department, fromDate, toDate]);

  async function updateStatus(id, nextStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Update failed');
        return;
      }
      toast.success(
        nextStatus === 'verified'
          ? 'Payment verified'
          : nextStatus === 'rejected'
            ? 'Payment marked as rejected'
            : 'Status updated'
      );
      // Update in place, or drop from list when it no longer matches the active tab.
      setSubmissions((prev) => {
        if (status !== 'all' && status !== nextStatus) {
          return prev.filter((s) => s._id !== id);
        }
        return prev.map((s) => (s._id === id ? { ...s, payment_slip_status: nextStatus } : s));
      });
      setCounts((prev) => {
        const next = { ...prev };
        const current = submissions.find((s) => s._id === id);
        const from = current?.payment_slip_status;
        if (from && Object.prototype.hasOwnProperty.call(next, from)) next[from] = Math.max(0, next[from] - 1);
        if (Object.prototype.hasOwnProperty.call(next, nextStatus)) next[nextStatus] = (next[nextStatus] || 0) + 1;
        return next;
      });
    } catch {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return submissions;
    const q = query.toLowerCase();
    return submissions.filter((s) =>
      [s.full_name, s.registration_no, s.email, s.payment_details?.reference_no, s.payment_details?.bank_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [submissions, query]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Slips</h1>
        <button
          type="button"
          onClick={fetchSubmissions}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <HiRefresh /> Refresh
        </button>
      </div>

      {/* Student-facing upload toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Student payment slip uploads</p>
          <p className="text-xs text-gray-500 mt-0.5">
            When disabled, students no longer see the &ldquo;Registration Fee&rdquo; section on their profile and cannot submit new slips. Existing submissions remain visible below.
          </p>
        </div>
        <label className="inline-flex items-center gap-3 shrink-0 cursor-pointer select-none">
          <span className={`text-xs font-medium ${uploadsEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
            {uploadsEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <span className="relative inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={uploadsEnabled}
              disabled={toggling}
              onChange={(e) => toggleUploads(e.target.checked)}
            />
            <span className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-emerald-500 transition-colors peer-disabled:opacity-60" />
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.key;
          const badge = tab.key === 'all' ? null : counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, registration no, email, or reference..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            <span>Submitted from</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            <span>Submitted to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 self-start sm:self-auto"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-gray-400 text-sm">No payment slips found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-left font-medium">Reg No</th>
                  <th className="px-4 py-3 text-left font-medium">Dept</th>
                  <th className="px-4 py-3 text-left font-medium">Bank / Ref</th>
                  <th className="px-4 py-3 text-left font-medium">Deposit</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Slip</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const d = s.payment_details || {};
                  const submittedAt = s.payment_slip_uploaded_at
                    ? new Date(s.payment_slip_uploaded_at).toLocaleString()
                    : '—';
                  const depositAt = d.deposit_date ? new Date(d.deposit_date).toLocaleDateString() : '—';
                  const isBusy = updatingId === s._id;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {s.avatar && (
                            <img
                              src={s.avatar}
                              alt=""
                              className="w-7 h-7 rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{s.full_name || '—'}</p>
                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{s.registration_no || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{s.department || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{d.bank_name || '—'}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">
                          {d.branch ? `${d.branch} · ` : ''}Ref: {d.reference_no || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{depositAt}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{submittedAt}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${
                            STATUS_STYLES[s.payment_slip_status] || STATUS_STYLES.none
                          }`}
                        >
                          {s.payment_slip_status || 'none'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.payment_slip_url ? (
                          <a
                            href={s.payment_slip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:underline text-xs"
                          >
                            View <HiExternalLink />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => updateStatus(s._id, 'verified')}
                            disabled={isBusy || s.payment_slip_status === 'verified'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <HiCheck /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(s._id, 'rejected')}
                            disabled={isBusy || s.payment_slip_status === 'rejected'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <HiX /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
