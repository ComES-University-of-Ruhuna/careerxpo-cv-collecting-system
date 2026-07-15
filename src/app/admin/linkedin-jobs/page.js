'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiX, HiExternalLink, HiEye, HiEyeOff } from 'react-icons/hi';

export default function AdminLinkedInJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', company_name: '', linkedin_url: '', description: '', location: '' });

  useEffect(() => { loadData(); }, [token]);

  async function loadData() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/linkedin-jobs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ title: '', company_name: '', linkedin_url: '', description: '', location: '' });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(job) {
    setForm({
      title: job.title,
      company_name: job.company_name,
      linkedin_url: job.linkedin_url,
      description: job.description || '',
      location: job.location || '',
    });
    setEditing(job._id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const url = editing ? `/api/admin/linkedin-jobs/${editing}` : '/api/admin/linkedin-jobs';
    const method = editing ? 'PUT' : 'POST';

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return; }

      toast.success(editing ? 'Updated' : 'Published');
      setShowForm(false);
      loadData();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(job) {
    const res = await fetch(`/api/admin/linkedin-jobs/${job._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !job.is_active }),
    });
    if (res.ok) {
      toast.success(job.is_active ? 'Deactivated' : 'Activated');
      loadData();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this LinkedIn job post?')) return;
    const res = await fetch(`/api/admin/linkedin-jobs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success('Deleted');
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">LinkedIn Jobs</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium self-start sm:self-auto">
          <HiPlus /> Publish Job
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Publish'} LinkedIn Job</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><HiX className="text-xl" /></button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g. Software Engineer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input type="text" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g. Google" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Job URL *</label>
              <input type="url" required value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="https://www.linkedin.com/jobs/view/..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g. Colombo, Sri Lanka" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Brief description of the role..." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? (editing ? 'Updating…' : 'Publishing…') : editing ? 'Update' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No LinkedIn jobs published yet</p>
          <p className="text-sm mt-1">Click &quot;Publish Job&quot; to add a LinkedIn job post link.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={job.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1">
                        {job.title} <HiExternalLink className="text-xs shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{job.company_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{job.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {job.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(job)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded" title={job.is_active ? 'Deactivate' : 'Activate'}>
                          {job.is_active ? <HiEyeOff /> : <HiEye />}
                        </button>
                        <button onClick={() => openEdit(job)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><HiPencil /></button>
                        <button onClick={() => handleDelete(job._id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><HiTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
