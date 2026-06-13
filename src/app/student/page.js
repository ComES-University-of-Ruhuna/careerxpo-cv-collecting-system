'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { HiCurrencyDollar, HiDocumentText, HiCollection } from 'react-icons/hi';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [bids, setBids] = useState([]);

  useEffect(() => {
    if (token) {
      fetch('/api/student/bids', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setBids(d.bids || []))
        .catch(() => {});
    }
  }, [token]);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <HiCurrencyDollar className="text-primary-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Remaining Credits</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{user?.remaining_credits ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiDocumentText className="text-green-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">CV Status</p>
          </div>
          <p className="text-lg font-semibold">
            {user?.cv_url ? (
              <a href={user.cv_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                Uploaded ✓
              </a>
            ) : (
              <span className="text-amber-600">Not uploaded</span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HiCollection className="text-purple-600 text-xl" />
            </div>
            <p className="text-sm text-gray-500">Bids Placed</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{bids.length}</p>
        </div>
      </div>

      {bids.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Bids</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {bids.map((bid) => (
              <div key={bid._id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{bid.job_id?.title || 'Unknown Position'}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {bid.job_id?.company_id?.name || 'Unknown Company'} · {new Date(bid.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary-600 shrink-0">-{bid.credits_spent} credits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
