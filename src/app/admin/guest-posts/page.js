'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiMail, HiPhone, HiUser, HiOfficeBuilding, HiCheck, HiX, HiEye, HiTrash, HiClock, HiCheckCircle, HiXCircle } from 'react-icons/hi';

// Only http(s) links are safe to render. Older guest posts (submitted before
// the server-side URL validator was tightened) may still contain
// javascript:/data: payloads, so we filter defensively at render time too.
function safeHref(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    const url = new URL(str);
    if (url.protocol === 'http:' || url.protocol === 'https:') return str;
  } catch {}
  return null;
}

const STATUS_TABS = [
  { value: 'pending', label: 'Pending', icon: <HiClock />, color: 'text-amber-600' },
  { value: 'approved', label: 'Approved', icon: <HiCheckCircle />, color: 'text-green-600' },
  { value: 'rejected', label: 'Rejected', icon: <HiXCircle />, color: 'text-red-600' },
];

export default function AdminGuestPostsPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [creditCost, setCreditCost] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guest-posts?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchPosts();
  }, [token, status]);

  const handleAction = async (action) => {
    if (action === 'approve' && (!creditCost || Number(creditCost) < 1)) {
      toast.error('Please set a credit cost (minimum 1).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/guest-posts/${selected._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, credit_cost: Number(creditCost), admin_note: adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setSelected(null);
      setCreditCost('');
      setAdminNote('');
      fetchPosts();
    } catch (err) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this guest post?')) return;
    try {
      const res = await fetch(`/api/admin/guest-posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Deleted');
        fetchPosts();
        if (selected?._id === id) setSelected(null);
      }
    } catch {}
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Guest Job Posts</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setStatus(tab.value); setSelected(null); }} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${status === tab.value ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {status} guest posts.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post List */}
          <div className="lg:col-span-1 space-y-3">
            {posts.map((post) => (
              <button key={post._id} onClick={() => { setSelected(post); setCreditCost(post.credit_cost || ''); setAdminNote(post.admin_note || ''); }} className={`w-full text-left p-4 rounded-xl border transition ${selected?._id === post._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-gray-900 truncate">{post.job_title}</p>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(post._id); }} className="text-gray-400 hover:text-red-500 transition p-1">
                    <HiTrash className="text-sm" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 truncate">{post.company_name}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><HiUser /> {post.contact_name}</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.job_title}</h2>
                  <p className="text-gray-600 flex items-center gap-1.5 mt-1"><HiOfficeBuilding /> {selected.company_name}</p>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Person</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <HiUser className="text-gray-400" />
                      <span>{selected.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiMail className="text-gray-400" />
                      <a href={`mailto:${selected.contact_email}`} className="text-primary-600 hover:underline">{selected.contact_email}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiPhone className="text-gray-400" />
                      <a href={`tel:${selected.contact_phone}`} className="text-primary-600 hover:underline">{selected.contact_phone}</a>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {selected.company_website && (
                    <div>
                      <span className="text-gray-500">Website:</span>
                      {safeHref(selected.company_website) ? (
                        <a
                          href={safeHref(selected.company_website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary-600 hover:underline break-all"
                        >
                          {selected.company_website}
                        </a>
                      ) : (
                        <span className="ml-2 text-gray-500 break-all">
                          {selected.company_website}{' '}
                          <span className="text-xs text-red-500">(unsafe URL — not linked)</span>
                        </span>
                      )}
                    </div>
                  )}
                  {selected.departments?.length > 0 && (
                    <div>
                      <span className="text-gray-500">Departments:</span>
                      <span className="ml-2">{selected.departments.join(', ')}</span>
                    </div>
                  )}
                  {selected.max_applicants && (
                    <div>
                      <span className="text-gray-500">Max Applicants:</span>
                      <span className="ml-2">{selected.max_applicants}</span>
                    </div>
                  )}
                  {selected.deadline && (
                    <div>
                      <span className="text-gray-500">Deadline:</span>
                      <span className="ml-2">{new Date(selected.deadline).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {selected.job_description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{selected.job_description}</p>
                  </div>
                )}

                {/* Admin Actions */}
                {selected.status === 'pending' && (
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credit Cost *</label>
                        <input type="number" min={1} value={creditCost} onChange={(e) => setCreditCost(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g. 10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note</label>
                        <input type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Optional note" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleAction('approve')} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50">
                        <HiCheck /> Approve & Create Job
                      </button>
                      <button onClick={() => handleAction('reject')} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50">
                        <HiX /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Already reviewed */}
                {selected.status !== 'pending' && (
                  <div className={`border-t border-gray-200 pt-4 text-sm ${selected.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                    <p className="font-medium capitalize">{selected.status}</p>
                    {selected.credit_cost && <p>Credit cost: {selected.credit_cost}</p>}
                    {selected.admin_note && <p>Note: {selected.admin_note}</p>}
                    {selected.reviewed_at && <p className="text-gray-400 mt-1">Reviewed: {new Date(selected.reviewed_at).toLocaleString()}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <HiEye className="text-4xl mx-auto mb-2" />
                <p>Select a guest post to review</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
