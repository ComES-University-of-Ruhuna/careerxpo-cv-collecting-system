'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiX, HiLockClosed, HiLockOpen, HiDownload, HiFolderOpen } from 'react-icons/hi';

export default function AdminJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ company_id: '', title: '', description: '', credit_cost: '10', max_applicants: '', deadline: '', departments: [] });
  const [loadingFolder, setLoadingFolder] = useState(null);

  const allDepartments = ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA'];

  useEffect(() => { loadData(); }, [token]);

  async function loadData() {
    if (!token) return;
    try {
      const [jobRes, compRes] = await Promise.all([
        fetch('/api/admin/jobs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/companies', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [jobData, compData] = await Promise.all([jobRes.json(), compRes.json()]);
      setJobs(jobData.jobs || []);
      setCompanies(compData.companies || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ company_id: companies[0]?._id || '', title: '', description: '', credit_cost: '10', max_applicants: '', deadline: '', departments: [] });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(job) {
    setForm({
      company_id: job.company_id?._id || job.company_id,
      title: job.title,
      description: job.description || '',
      credit_cost: String(job.credit_cost || 10),
      max_applicants: job.max_applicants ? String(job.max_applicants) : '',
      deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 16) : '',
      departments: job.departments || [],
    });
    setEditing(job._id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.company_id || !form.title) {
      toast.error('Company and title are required');
      return;
    }

    const creditCost = parseInt(form.credit_cost, 10);
    if (!creditCost || creditCost < 1) {
      toast.error('Credit cost must be a positive integer');
      return;
    }

    const maxApplicants = form.max_applicants ? parseInt(form.max_applicants, 10) : null;
    if (form.max_applicants && (isNaN(maxApplicants) || maxApplicants < 1)) {
      toast.error('Max applicants must be a positive integer');
      return;
    }

    const url = editing ? `/api/admin/jobs/${editing}` : '/api/admin/jobs';
    const method = editing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, credit_cost: creditCost, max_applicants: maxApplicants, deadline: form.deadline || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      toast.success(editing ? 'Job updated' : 'Job created');
      setShowForm(false);
      loadData();
    } catch {
      toast.error('Operation failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this job vacancy?')) return;
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Job deleted');
        loadData();
      }
    } catch {
      toast.error('Delete failed');
    }
  }

  async function toggleClose(job) {
    const newStatus = !job.is_closed;
    try {
      const res = await fetch(`/api/admin/jobs/${job._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_closed: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus ? 'Vacancy closed' : 'Vacancy reopened');
        loadData();
      }
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function handleExport(jobId) {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'applications.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleDriveFolder(jobId) {
    setLoadingFolder(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/drive-folder`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to get folder link');
        return;
      }
      window.open(data.folder_url, '_blank');
    } catch {
      toast.error('Failed to get Drive folder link');
    } finally {
      setLoadingFolder(null);
    }
  }

  function getJobStatus(job) {
    if (job.is_closed) return { label: 'Closed', color: 'bg-red-100 text-red-700' };
    if (job.deadline && new Date(job.deadline) < new Date()) return { label: 'Expired', color: 'bg-gray-200 text-gray-600' };
    return { label: 'Open', color: 'bg-green-100 text-green-700' };
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Vacancy Management</h1>
        <button onClick={openNew} disabled={companies.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50 self-start sm:self-auto">
          <HiPlus /> Add Job
        </button>
      </div>

      {companies.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-700">
          Create a company first before adding jobs.
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit Job' : 'New Job'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><HiX /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required>
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Cost *</label>
                <input type="number" min="1" value={form.credit_cost} onChange={(e) => setForm({ ...form, credit_cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Applicants</label>
                <input type="number" min="1" value={form.max_applicants} onChange={(e) => setForm({ ...form, max_applicants: e.target.value })} placeholder="Unlimited" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Leave empty for unlimited</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Leave empty for no deadline</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departments</label>
              <div className="flex flex-wrap gap-2">
                {allDepartments.map((dept) => (
                  <label key={dept} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                    form.departments.includes(dept)
                      ? 'bg-primary-100 border-primary-400 text-primary-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={form.departments.includes(dept)}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          departments: e.target.checked
                            ? [...form.departments, dept]
                            : form.departments.filter((d) => d !== dept),
                        });
                      }}
                    />
                    {dept}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave empty to show for all departments</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Markdown supported)</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm">
              {editing ? 'Update Job' : 'Create Job'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Title</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Company</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Credits</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Max Applicants</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Departments</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Deadline</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-500">No jobs yet</td></tr>
            ) : (
              jobs.map((j) => (
                <tr key={j._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{j.title}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{j.company_id?.name || '—'}</td>
                  <td className="px-5 py-3"><span className="bg-primary-100 text-primary-700 text-sm px-2 py-0.5 rounded-full font-medium">{j.credit_cost}</span></td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {j.max_applicants ? (
                      <span className="bg-amber-100 text-amber-700 text-sm px-2 py-0.5 rounded-full font-medium">{j.max_applicants}</span>
                    ) : (
                      <span className="text-gray-400">Unlimited</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {j.departments?.length > 0
                      ? j.departments.map((d) => (
                          <span key={d} className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1">{d}</span>
                        ))
                      : <span className="text-gray-400">All</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {j.deadline ? new Date(j.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-5 py-3">
                    {(() => { const s = getJobStatus(j); return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>; })()}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => handleDriveFolder(j._id)} title="Open CV folder in Drive" disabled={loadingFolder === j._id} className="text-gray-400 hover:text-blue-600 p-1 disabled:opacity-50">
                      {loadingFolder === j._id ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" /> : <HiFolderOpen />}
                    </button>
                    <button onClick={() => handleExport(j._id)} title="Export applications" className="text-gray-400 hover:text-green-600 p-1"><HiDownload /></button>
                    <button onClick={() => toggleClose(j)} title={j.is_closed ? 'Reopen' : 'Close'} className={`p-1 ${j.is_closed ? 'text-green-500 hover:text-green-700' : 'text-amber-500 hover:text-amber-700'}`}>
                      {j.is_closed ? <HiLockOpen /> : <HiLockClosed />}
                    </button>
                    <button onClick={() => openEdit(j)} className="text-gray-400 hover:text-primary-600 p-1 ml-1"><HiPencil /></button>
                    <button onClick={() => handleDelete(j._id)} className="text-gray-400 hover:text-red-600 p-1 ml-1"><HiTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
