'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiUserGroup,
  HiDocumentText,
  HiChartBar,
  HiCurrencyDollar,
  HiCheckCircle,
  HiShieldCheck,
  HiAcademicCap,
  HiExclamationCircle,
} from 'react-icons/hi';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDepartment, setCreditDepartment] = useState('all');
  const [addingCredits, setAddingCredits] = useState(false);

  const DEPARTMENT_OPTIONS = [
    { value: 'all', label: 'All Departments' },
    { value: 'DEIE', label: 'DEIE' },
    { value: 'DMME', label: 'DMME' },
    { value: 'COM', label: 'COM' },
    { value: 'DCEE', label: 'DCEE' },
    { value: 'DMENA', label: 'DMENA' },
  ];

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const totalStudents = stats?.total_students ?? 0;
  const totalCvs = stats?.total_cvs ?? 0;
  const totalProfileCompleted = stats?.total_profile_completed ?? 0;
  const totalCvConsent = stats?.total_cv_consent ?? 0;
  const unassignedDepartment = stats?.unassigned_department ?? 0;
  const byDepartment = Array.isArray(stats?.by_department) ? stats.by_department : [];

  const pct = (part, total) => {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  };

  // Colour palette per department so charts stay visually distinct.
  const DEPT_COLORS = {
    DEIE: { bar: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700', ring: 'ring-blue-200' },
    DMME: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
    COM: { bar: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
    DCEE: { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-700', ring: 'ring-orange-200' },
    DMENA: { bar: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-700', ring: 'ring-cyan-200' },
  };
  const fallbackColor = { bar: 'bg-gray-500', chip: 'bg-gray-100 text-gray-700', ring: 'ring-gray-200' };
  const colorFor = (dept) => DEPT_COLORS[dept] || fallbackColor;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Top-line stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <HiUserGroup className="text-primary-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiDocumentText className="text-green-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">CVs Uploaded</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCvs}</p>
          <p className="text-xs text-gray-400 mt-1">{pct(totalCvs, totalStudents)}% of students</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <HiCheckCircle className="text-teal-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Profiles Completed</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalProfileCompleted}</p>
          <p className="text-xs text-gray-400 mt-1">{pct(totalProfileCompleted, totalStudents)}% of students</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <HiShieldCheck className="text-indigo-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">CV Consent Granted</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCvConsent}</p>
          <p className="text-xs text-gray-400 mt-1">{pct(totalCvConsent, totalStudents)}% of students</p>
        </div>
      </div>

      {/* Student Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="p-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-50 rounded-lg">
              <HiAcademicCap className="text-primary-600 text-lg" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Student Preferences</h2>
              <p className="text-xs text-gray-500">Distribution by department and sub-specialization</p>
            </div>
          </div>
          {unassignedDepartment > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              <HiExclamationCircle />
              {unassignedDepartment} student{unassignedDepartment !== 1 ? 's' : ''} without a department
            </div>
          )}
        </div>

        <div className="p-5 space-y-6">
          {/* Department distribution */}
          <div>
            <div className="flex justify-between items-baseline mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Department distribution</h3>
              <span className="text-xs text-gray-400">Share of {totalStudents} student{totalStudents !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {byDepartment.map((d) => {
                const color = colorFor(d.department);
                const percent = pct(d.count, totalStudents);
                return (
                  <div key={d.department}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${color.chip} shrink-0`}>
                          {d.department}
                        </span>
                        <span className="text-gray-600 truncate">{d.label}</span>
                      </div>
                      <span className="text-gray-700 font-medium shrink-0 tabular-nums">
                        {d.count} <span className="text-gray-400 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bar} transition-all`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {byDepartment.length === 0 && (
                <p className="text-sm text-gray-500">No student data yet.</p>
              )}
            </div>
          </div>

          {/* Per-department detail cards */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Sub-specialization breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byDepartment.map((d) => {
                const color = colorFor(d.department);
                const deptTotal = d.count;
                const subs = d.sub_specializations || [];
                const hasKnownSubs = subs.some((s) => s.sub_specialization !== null);
                return (
                  <div
                    key={d.department}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${color.chip} shrink-0`}>
                          {d.department}
                        </span>
                        <p className="text-sm font-medium text-gray-900 truncate">{d.label}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{deptTotal}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 rounded-md p-2 text-center">
                        <p className="text-gray-500">Profiles</p>
                        <p className="font-semibold text-gray-900">
                          {d.profile_completed}
                          <span className="text-gray-400 font-normal">/{deptTotal}</span>
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 text-center">
                        <p className="text-gray-500">CVs</p>
                        <p className="font-semibold text-gray-900">
                          {d.with_cv}
                          <span className="text-gray-400 font-normal">/{deptTotal}</span>
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 text-center">
                        <p className="text-gray-500">Consent</p>
                        <p className="font-semibold text-gray-900">
                          {d.cv_consent}
                          <span className="text-gray-400 font-normal">/{deptTotal}</span>
                        </p>
                      </div>
                    </div>

                    {hasKnownSubs ? (
                      <div className="space-y-2">
                        {subs.map((s) => {
                          const label = s.sub_specialization === null ? 'Not specified' : s.sub_specialization;
                          const isUnspecified = s.sub_specialization === null;
                          const percent = pct(s.count, deptTotal);
                          if (isUnspecified && s.count === 0) return null;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={isUnspecified ? 'text-gray-400 italic' : 'text-gray-700'}>
                                  {label}
                                </span>
                                <span className="text-gray-500 tabular-nums">
                                  {s.count} <span className="text-gray-400">({percent}%)</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isUnspecified ? 'bg-gray-300' : color.bar} transition-all`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No sub-specializations configured for this department.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {stats?.bids_per_job?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="p-5 border-b border-gray-200 flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HiChartBar className="text-purple-600 text-lg" />
            </div>
            <h2 className="font-semibold text-gray-900">Bids Per Position</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.bids_per_job.map((item) => (
              <div key={item._id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{item.job_title}</p>
                  <p className="text-sm text-gray-500">{item.company_name}</p>
                </div>
                <span className="bg-primary-100 text-primary-700 text-sm px-3 py-1 rounded-full font-medium">
                  {item.total_bids} bid{item.total_bids !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Credit Top-Up */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <HiCurrencyDollar className="text-amber-600 text-xl" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Add Credits to Students</h2>
            <p className="text-sm text-gray-500">Increase student credit balances by a fixed amount — either for all students or a specific department</p>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseInt(creditAmount, 10);
            if (!amount || amount < 1) { toast.error('Enter a valid positive number'); return; }
            const scopeLabel = creditDepartment === 'all' ? 'ALL students' : `${creditDepartment} students`;
            if (!confirm(`Add ${amount} credits to ${scopeLabel}?`)) return;
            setAddingCredits(true);
            try {
              const res = await fetch('/api/admin/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ amount, department: creditDepartment }),
              });
              const data = await res.json();
              if (!res.ok) { toast.error(data.error); return; }
              toast.success(data.message);
              setCreditAmount('');
            } catch {
              toast.error('Failed to add credits');
            } finally {
              setAddingCredits(false);
            }
          }}
          className="flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={creditDepartment}
              onChange={(e) => setCreditDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
            >
              {DEPARTMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Credits to add</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={addingCredits}
            className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium text-sm disabled:opacity-50"
          >
            {addingCredits
              ? 'Adding...'
              : creditDepartment === 'all'
                ? 'Add to All Students'
                : `Add to ${creditDepartment}`}
          </button>
        </form>
      </div>
    </div>
  );
}
