'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { HiExternalLink, HiLocationMarker, HiOfficeBuilding } from 'react-icons/hi';

export default function StudentLinkedInJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/student/linkedin-jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">LinkedIn Jobs</h1>
      <p className="text-sm text-gray-500 mb-6">Browse job opportunities posted on LinkedIn. Click to view the full post.</p>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No LinkedIn jobs available right now</p>
          <p className="text-sm mt-1">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <a
              key={job._id}
              href={job.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition truncate">{job.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <HiOfficeBuilding className="shrink-0" />
                    <span className="truncate">{job.company_name}</span>
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                      <HiLocationMarker className="shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}
                </div>
                <HiExternalLink className="text-gray-300 group-hover:text-primary-500 text-lg shrink-0 mt-1 transition" />
              </div>
              {job.description && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{job.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">{new Date(job.created_at).toLocaleDateString()}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
