'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiUserGroup, HiDocumentText, HiChartBar, HiCurrencyDollar } from 'react-icons/hi';

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

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <HiUserGroup className="text-primary-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_students ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiDocumentText className="text-green-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">CVs Uploaded</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_cvs ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HiChartBar className="text-purple-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Companies Tracked</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.bids_per_job?.length ?? 0}</p>
        </div>
      </div>

      {stats?.bids_per_job?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200">
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
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
