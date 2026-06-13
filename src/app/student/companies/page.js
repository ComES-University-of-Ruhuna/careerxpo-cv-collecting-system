'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { HiCurrencyDollar, HiExternalLink, HiCheck, HiUpload, HiDocumentText } from 'react-icons/hi';

export default function CompaniesPage() {
  const { token, user, updateUser } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [myBids, setMyBids] = useState({});
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(null);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    if (!token) return;
    const deptParam = user?.department ? `?department=${user.department}` : '';
    Promise.all([
      fetch(`/api/student/companies${deptParam}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/student/bids', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([compData, bidData]) => {
      setCompanies(compData.companies || []);
      const bidMap = {};
      (bidData.bids || []).forEach((b) => {
        const jobId = b.job_id?._id || b.job_id;
        bidMap[jobId] = { cv_url: b.cv_url, cv_drive_id: b.cv_drive_id };
      });
      setMyBids(bidMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, user?.department]);

  async function handleBid(jobId, creditCost) {
    if (myBids[jobId]) {
      toast.error('You have already bid on this position');
      return;
    }
    if ((user?.remaining_credits || 0) < creditCost) {
      toast.error(`Insufficient credits. You need ${creditCost} but have ${user?.remaining_credits || 0}.`);
      return;
    }

    setBidding(jobId);
    try {
      const res = await fetch('/api/student/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Bid placed successfully!');
      setMyBids((prev) => ({ ...prev, [jobId]: { cv_url: null, cv_drive_id: null } }));
      updateUser({ remaining_credits: data.remaining_credits });
    } catch {
      toast.error('Failed to place bid');
    } finally {
      setBidding(null);
    }
  }

  async function handleJobCV(e, jobId) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    setUploading(jobId);
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('job_id', jobId);

    try {
      const res = await fetch('/api/student/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Resume uploaded!');
      setMyBids((prev) => ({
        ...prev,
        [jobId]: { cv_url: data.cv_url, cv_drive_id: data.cv_drive_id },
      }));
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Companies & Job Directory</h1>
        <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium self-start sm:self-auto">
          <HiCurrencyDollar className="inline mr-1" />
          {user?.remaining_credits ?? 0} credits left
        </span>
      </div>

      {companies.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No companies listed yet.</p>
      ) : (
        <div className="space-y-6">
          {companies.map((company) => (
            <div key={company._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                      {company.name[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-lg text-gray-900">{company.name}</h2>
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                        <HiExternalLink /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {company.jobs?.length > 0 ? (
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Open Positions</h3>
                  <div className="space-y-3">
                    {company.jobs.map((job) => {
                      const bidInfo = myBids[job._id];
                      const hasBid = !!bidInfo;
                      const isFull = job.max_applicants && job.current_applicants >= job.max_applicants && !hasBid;
                      const isClosed = job.is_closed || (job.deadline && new Date(job.deadline) < new Date());
                      const cantBid = isClosed || isFull;
                      return (
                        <div key={job._id} className={`bg-gray-50 rounded-lg p-4 ${isClosed && !hasBid ? 'opacity-60' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{job.title}</p>
                                {isClosed && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Closed</span>
                                )}
                              </div>
                              {job.deadline && !isClosed && (
                                <p className="text-xs mt-0.5 text-amber-600">
                                  Deadline: {new Date(job.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              {job.max_applicants && !isClosed && (
                                <p className={`text-xs mt-0.5 ${isFull ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                  {isFull
                                    ? 'Applications closed — all slots filled'
                                    : `${job.current_applicants || 0} / ${job.max_applicants} slots filled`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-500">
                                <HiCurrencyDollar className="inline" /> {job.credit_cost} credits
                              </span>
                              <button
                                onClick={() => handleBid(job._id, job.credit_cost)}
                                disabled={hasBid || bidding === job._id || cantBid}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  hasBid
                                    ? 'bg-green-100 text-green-700 cursor-default'
                                    : cantBid
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                                }`}
                              >
                                {hasBid ? (
                                  <span className="flex items-center gap-1"><HiCheck /> Applied</span>
                                ) : isClosed ? 'Closed' : isFull ? 'Full' : bidding === job._id ? 'Bidding...' : 'Bid / Apply'}
                              </button>
                            </div>
                          </div>
                          {job.description && (
                            <div className="text-sm text-gray-600 mt-1 prose prose-sm max-w-none">
                              <ReactMarkdown>{job.description}</ReactMarkdown>
                            </div>
                          )}
                          {hasBid && (
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-sm">
                                <HiDocumentText className="text-gray-400" />
                                {bidInfo.cv_url ? (
                                  <span className="text-green-700 font-medium">
                                    Resume uploaded ✓{' '}
                                    <a href={bidInfo.cv_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                      View →
                                    </a>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 text-xs">No resume uploaded for this position</span>
                                )}
                              </div>
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-xs">
                                <HiUpload />
                                {uploading === job._id ? 'Uploading...' : bidInfo.cv_url ? 'Re-upload' : 'Upload Resume'}
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  onChange={(e) => handleJobCV(e, job._id)}
                                  disabled={uploading === job._id}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-5 text-sm text-gray-400">No open positions listed.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
