'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';

export default function AdminCompanies() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', logo: '', website: '' });

  useEffect(() => { loadCompanies(); }, [token]);

  async function loadCompanies() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/companies', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ name: '', logo: '', website: '' });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(company) {
    setForm({ name: company.name, logo: company.logo, website: company.website });
    setEditing(company._id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      toast.error('Company name is required');
      return;
    }

    const body = { ...form };
    const url = editing ? `/api/admin/companies/${editing}` : '/api/admin/companies';
    const method = editing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      toast.success(editing ? 'Company updated' : 'Company created');
      setShowForm(false);
      loadCompanies();
    } catch {
      toast.error('Operation failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this company and all its jobs/bids?')) return;
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Company deleted');
        loadCompanies();
      }
    } catch {
      toast.error('Delete failed');
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium">
          <HiPlus /> Add Company
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit Company' : 'New Company'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><HiX /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm">
                {editing ? 'Update Company' : 'Create Company'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Company</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Website</th>
              <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500">No companies yet</td></tr>
            ) : (
              companies.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {c.logo ? (
                        <img src={c.logo} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">{c.name[0]}</div>
                      )}
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{c.website || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-primary-600 p-1"><HiPencil /></button>
                    <button onClick={() => handleDelete(c._id)} className="text-gray-400 hover:text-red-600 p-1 ml-2"><HiTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
