'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiSearch, HiRefresh, HiTrash, HiEye, HiX } from 'react-icons/hi';

export default function AdminStudents() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [bids, setBids] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) {
      toast.error('Enter at least 2 characters to search');
      return;
    }

    setSearching(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/admin/students?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStudents(data.students || []);
      if ((data.students || []).length === 0) {
        toast('No students found', { icon: '🔍' });
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function viewStudent(id) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setSelected(data.student);
      setBids(data.bids || []);
    } catch {
      toast.error('Failed to load student');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function resetBids(id) {
    if (!confirm('Reset all bids for this student? Credits will be refunded.')) return;
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(data.message);
      viewStudent(id);
      // Update student in search results
      setStudents((prev) =>
        prev.map((s) => (s._id === id ? { ...s, remaining_credits: data.remaining_credits } : s))
      );
    } catch {
      toast.error('Failed to reset bids');
    }
  }

  async function deleteStudent(id) {
    if (!confirm('Permanently delete this student account and all their bids? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Student account deleted');
      setSelected(null);
      setBids([]);
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch {
      toast.error('Failed to delete student');
    }
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Student Management</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, registration number, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-1">
          {students.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <p className="text-sm font-medium text-gray-600">{students.length} student(s) found</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {students.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => viewStudent(s._id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selected?._id === s._id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm">{s.full_name || 'No name'}</p>
                    <p className="text-xs text-gray-500">{s.registration_no || 'No reg no'}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student Detail */}
        <div className="lg:col-span-2">
          {loadingDetail && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          )}

          {selected && !loadingDetail && (
            <div className="space-y-4">
              {/* Info Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {selected.avatar && (
                      <img src={selected.avatar} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <h2 className="font-semibold text-lg text-gray-900">{selected.full_name || 'No name set'}</h2>
                      <p className="text-sm text-gray-500">{selected.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setBids([]); }} className="text-gray-400 hover:text-gray-600">
                    <HiX />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Reg No</p>
                    <p className="font-medium">{selected.registration_no || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p className="font-medium">{selected.department || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Credits</p>
                    <p className="font-medium text-primary-600">{selected.remaining_credits}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CV</p>
                    <p className="font-medium">
                      {selected.cv_url ? (
                        <a href={selected.cv_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                          Uploaded ✓
                        </a>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => resetBids(selected._id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
                  >
                    <HiRefresh /> Reset All Bids
                  </button>
                  <button
                    onClick={() => deleteStudent(selected._id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                  >
                    <HiTrash /> Delete Account
                  </button>
                </div>
              </div>

              {/* Bids */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Bids ({bids.length})</h3>
                </div>
                {bids.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No bids placed</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {bids.map((bid) => (
                      <div key={bid._id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{bid.job_id?.title || 'Unknown Position'}</p>
                          <p className="text-xs text-gray-500">
                            {bid.job_id?.company_id?.name || 'Unknown Company'} · {new Date(bid.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {bid.cv_url && (
                            <a href={bid.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                              CV ✓
                            </a>
                          )}
                          <span className="text-sm font-medium text-primary-600">-{bid.credits_spent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selected && !loadingDetail && students.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center p-12">
              <p className="text-gray-400 text-sm flex items-center gap-2"><HiEye /> Select a student to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
