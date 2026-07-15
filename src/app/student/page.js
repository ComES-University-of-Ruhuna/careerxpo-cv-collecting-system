'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { HiCurrencyDollar, HiDocumentText, HiCollection, HiCash, HiCheckCircle, HiClock, HiXCircle } from 'react-icons/hi';
import PaymentSlipModal from '@/components/PaymentSlipModal';

export default function StudentDashboard() {
  const { user, token, updateUser } = useAuth();
  const [bids, setBids] = useState([]);
  const [slipModalOpen, setSlipModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/student/bids', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setBids(d.bids || []))
        .catch(() => {});
    }
  }, [token]);

  function handleSlipSuccess(data) {
    updateUser({
      payment_slip_url: data.payment_slip_url,
      payment_slip_drive_id: data.payment_slip_drive_id,
      payment_slip_uploaded_at: data.payment_slip_uploaded_at,
      payment_slip_status: data.payment_slip_status,
      payment_details: data.payment_details,
    });
  }

  const slipStatus = user?.payment_slip_status || 'none';
  const slipUploaded = !!user?.payment_slip_url;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

      {!user?.profile_completed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 font-medium">Complete your profile</p>
          <p className="text-sm text-amber-700 mt-1">
            Add your registration number, full name, department, and accept the data sharing consent to start bidding.
          </p>
          <a href="/student/profile" className="inline-block mt-2 text-sm font-medium text-primary-600 hover:underline">Go to My Profile →</a>
        </div>
      )}

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

      {/* Registration Fee — Bank Slip */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <HiCash className="text-emerald-600 text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900">Registration Fee</h2>
            <p className="text-sm text-gray-500">
              A one-time registration fee of <span className="font-semibold text-gray-800">LKR 500</span> is required.
              Deposit the fee to our bank account and upload the slip below. Please include your registration number
              {user?.registration_no ? (
                <span className="font-semibold"> ({user.registration_no}) </span>
              ) : (
                ' '
              )}
              as the payment reference.
            </p>
          </div>
        </div>

        <SlipStatusBanner status={slipStatus} uploaded={slipUploaded} user={user} />

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={() => setSlipModalOpen(true)}
            disabled={!user?.registration_no}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiCash />
            {slipUploaded ? 'Re-submit Bank Slip' : 'Submit Bank Slip'}
          </button>
          {!user?.registration_no && (
            <p className="text-xs text-amber-600">
              Add your registration number in <a href="/student/profile" className="underline">My Profile</a> first.
            </p>
          )}
          {user?.payment_slip_url && (
            <a
              href={user.payment_slip_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:underline"
            >
              View submitted slip →
            </a>
          )}
        </div>
      </div>

      <PaymentSlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        token={token}
        user={user}
        onSuccess={handleSlipSuccess}
      />
    </div>
  );
}

function SlipStatusBanner({ status, uploaded, user }) {
  if (!uploaded) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        No bank slip submitted yet.
      </div>
    );
  }

  const uploadedAt = user?.payment_slip_uploaded_at
    ? new Date(user.payment_slip_uploaded_at).toLocaleString()
    : null;

  const map = {
    pending: {
      cls: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <HiClock className="text-blue-600 text-lg shrink-0" />,
      label: 'Pending verification',
    },
    verified: {
      cls: 'bg-green-50 border-green-200 text-green-800',
      icon: <HiCheckCircle className="text-green-600 text-lg shrink-0" />,
      label: 'Verified',
    },
    rejected: {
      cls: 'bg-red-50 border-red-200 text-red-800',
      icon: <HiXCircle className="text-red-600 text-lg shrink-0" />,
      label: 'Rejected — please re-submit',
    },
  };
  const entry = map[status] || map.pending;

  return (
    <div className={`border rounded-lg p-3 text-sm flex items-start gap-2 ${entry.cls}`}>
      {entry.icon}
      <div className="min-w-0">
        <p className="font-medium">{entry.label}</p>
        {uploadedAt && <p className="text-xs opacity-80 mt-0.5">Submitted on {uploadedAt}</p>}
      </div>
    </div>
  );
}
