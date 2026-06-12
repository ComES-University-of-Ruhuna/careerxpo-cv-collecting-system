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
  const [addingCredits, setAddingCredits] = useState(false);

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
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
            <h2 className="font-semibold text-gray-900">Add Credits to All Students</h2>
            <p className="text-sm text-gray-500">Increase every student&apos;s credit balance by a fixed amount</p>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseInt(creditAmount, 10);
            if (!amount || amount < 1) { toast.error('Enter a valid positive number'); return; }
            if (!confirm(`Add ${amount} credits to ALL students?`)) return;
            setAddingCredits(true);
            try {
              const res = await fetch('/api/admin/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ amount }),
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
          className="flex items-end gap-3"
        >
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
            {addingCredits ? 'Adding...' : 'Add to All Students'}
          </button>
        </form>
      </div>
    </div>
  );
}
