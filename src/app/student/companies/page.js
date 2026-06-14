'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { HiCurrencyDollar, HiExternalLink, HiCheck, HiUpload, HiDocumentText, HiSearch } from 'react-icons/hi';

export default function CompaniesPage() {
  const { token, user, updateUser } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [myBids, setMyBids] = useState({});
  // Track uploaded CVs per job (before bidding)
  const [uploadedCVs, setUploadedCVs] = useState({});
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [search, setSearch] = useState('');

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

    const cvInfo = uploadedCVs[jobId];
    if (!cvInfo) {
      toast.error('Please upload your CV for this position first.');
      return;
    }

    setBidding(jobId);
    try {
      const res = await fetch('/api/student/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ job_id: jobId, cv_drive_id: cvInfo.cv_drive_id, cv_url: cvInfo.cv_url }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Bid placed successfully!');
      setMyBids((prev) => ({ ...prev, [jobId]: { cv_url: cvInfo.cv_url, cv_drive_id: cvInfo.cv_drive_id } }));
      setUploadedCVs((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
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

      if (myBids[jobId]) {
        // Already bid — update the bid's CV info
        setMyBids((prev) => ({
          ...prev,
          [jobId]: { cv_url: data.cv_url, cv_drive_id: data.cv_drive_id },
        }));
      } else {
        // Not yet bid — store CV info so bid button appears
        setUploadedCVs((prev) => ({
          ...prev,
          [jobId]: { cv_url: data.cv_url, cv_drive_id: data.cv_drive_id },
        }));
      }
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

      {!user?.profile_completed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 font-medium">Complete your profile to start bidding</p>
          <p className="text-sm text-amber-700 mt-1">
            You need to add your registration number, full name, department, and accept the data sharing consent before you can bid on positions.
          </p>
          <a href="/student/profile" className="inline-block mt-2 text-sm font-medium text-primary-600 hover:underline">Go to My Profile →</a>
        </div>
      )}

      {companies.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No companies listed yet.</p>
      ) : (
        <>
        <div className="relative mb-4">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies or job titles..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="space-y-6">
          {companies.filter((company) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            if (company.name.toLowerCase().includes(q)) return true;
            return company.jobs?.some((job) => job.title.toLowerCase().includes(q));
          }).map((company) => (
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
                      const cvUploaded = !!uploadedCVs[job._id];
                      const isFull = job.max_applicants && job.current_applicants >= job.max_applicants && !hasBid;
                      const isClosed = job.is_closed || (job.deadline && new Date(job.deadline) < new Date());
                      const needsProfile = !user?.profile_completed;
                      const isUploading = uploading === job._id;
                      const cantBid = isClosed || isFull || needsProfile;
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

                              {/* Flow: Applied → Bid → Uploading → Upload CV */}
                              {hasBid ? (
                                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                                  <HiCheck /> Applied
                                </span>
                              ) : isUploading ? (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent" />
                                  Uploading...
                                </span>
                              ) : cvUploaded ? (
                                <button
                                  onClick={() => handleBid(job._id, job.credit_cost)}
                                  disabled={bidding === job._id || cantBid}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                                >
                                  {bidding === job._id ? 'Bidding...' : 'Bid / Apply'}
                                </button>
                              ) : cantBid ? (
                                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed">
                                  {isClosed ? 'Closed' : isFull ? 'Full' : 'Complete Profile'}
                                </span>
                              ) : (
                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-xs">
                                  <HiUpload />
                                  Upload CV
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => handleJobCV(e, job._id)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                          {job.description && (
                            <div className="text-sm text-gray-600 mt-1 prose prose-sm max-w-none">
                              <ReactMarkdown>{job.description}</ReactMarkdown>
                            </div>
                          )}

                          {/* Show CV info after upload (before or after bid) */}
                          {(cvUploaded || (hasBid && bidInfo.cv_url)) && (
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-sm">
                                <HiDocumentText className="text-gray-400" />
                                <span className="text-green-700 font-medium">
                                  Resume uploaded ✓{' '}
                                  <a href={(uploadedCVs[job._id] || bidInfo)?.cv_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                    View →
                                  </a>
                                </span>
                              </div>
                              {hasBid && (
                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-xs">
                                  <HiUpload />
                                  {uploading === job._id ? 'Uploading...' : 'Re-upload'}
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => handleJobCV(e, job._id)}
                                    disabled={uploading === job._id}
                                    className="hidden"
                                  />
                                </label>
                              )}
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
        </>
      )}
    </div>
  );
}
