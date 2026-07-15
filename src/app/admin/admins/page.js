'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { HiKey, HiRefresh, HiShieldCheck, HiSearch, HiCheck, HiX } from 'react-icons/hi';

const PERMISSION_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View stats and platform overview' },
  { key: 'companies', label: 'Companies', description: 'Manage companies' },
  { key: 'jobs', label: 'Job Vacancies', description: 'Manage job postings and exports' },
  { key: 'linkedin-jobs', label: 'LinkedIn Jobs', description: 'Manage LinkedIn job links' },
  { key: 'guest-posts', label: 'Guest Posts', description: 'Review guest job submissions' },
  { key: 'students', label: 'Students', description: 'Search and manage student accounts' },
  { key: 'payments', label: 'Payments', description: 'Review and approve registration fee slips' },
  { key: 'logs', label: 'Activity Logs', description: 'View admin activity history' },
];

export default function AdminAdminsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'admin';

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [permDraft, setPermDraft] = useState([]);
  const [savingId, setSavingId] = useState(null);

  // "Grant admin access" search — find any user (typically a lecturer who
  // just signed in with their email) and promote them to a sub-admin.
  const [grantQuery, setGrantQuery] = useState('');
  const [grantResults, setGrantResults] = useState([]);
  const [grantSearching, setGrantSearching] = useState(false);
  const [grantSearched, setGrantSearched] = useState(false);
  const [grantingId, setGrantingId] = useState(null);
  const [grantDraft, setGrantDraft] = useState([]);

  // Sub-admins should never see this tab.
  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace('/admin');
    }
  }, [user, isSuperAdmin, router]);

  async function loadAdmins({ silent = false } = {}) {
    if (!token || !isSuperAdmin) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load admins');
        return;
      }
      setAdmins(data.admins || []);
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => {
      const haystack = [a.full_name, a.email, a.registration_no].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [admins, query]);

  const superAdmins = filtered.filter((a) => a.role === 'admin');
  const subAdmins = filtered.filter((a) => a.role !== 'admin');

  function startEditing(a) {
    setEditingId(a._id);
    setPermDraft(Array.isArray(a.admin_permissions) ? [...a.admin_permissions] : []);
  }

  function cancelEditing() {
    setEditingId(null);
    setPermDraft([]);
  }

  function togglePerm(key) {
    setPermDraft((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function toggleAll(checked) {
    setPermDraft(checked ? PERMISSION_OPTIONS.map((p) => p.key) : []);
  }

  async function handleGrantSearch(e) {
    e?.preventDefault();
    const q = grantQuery.trim();
    if (q.length < 2) {
      toast.error('Enter at least 2 characters to search');
      return;
    }
    setGrantSearching(true);
    setGrantSearched(true);
    try {
      const res = await fetch(`/api/admin/students?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Search failed');
        setGrantResults([]);
        return;
      }
      // Exclude anyone who already has admin capabilities — those are
      // already visible in the sub-admin / super-admin lists.
      const adminIds = new Set(admins.map((a) => a._id));
      const candidates = (data.students || []).filter(
        (s) => !adminIds.has(s._id) && !(Array.isArray(s.admin_permissions) && s.admin_permissions.length > 0)
      );
      setGrantResults(candidates);
    } catch {
      toast.error('Search failed');
      setGrantResults([]);
    } finally {
      setGrantSearching(false);
    }
  }

  function startGranting(candidate) {
    setGrantingId(candidate._id);
    // Sensible default — dashboard access. Super-admin can toggle before saving.
    setGrantDraft(['dashboard']);
  }

  function cancelGranting() {
    setGrantingId(null);
    setGrantDraft([]);
  }

  function toggleGrantPerm(key) {
    setGrantDraft((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function toggleGrantAll(checked) {
    setGrantDraft(checked ? PERMISSION_OPTIONS.map((p) => p.key) : []);
  }

  async function saveGrant(id) {
    if (grantDraft.length === 0) {
      toast.error('Select at least one permission to grant admin access');
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/students/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: grantDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to grant access');
        return;
      }
      toast.success('Admin access granted');
      // Drop them from search results and refresh the admin list.
      setGrantResults((prev) => prev.filter((c) => c._id !== id));
      setGrantingId(null);
      setGrantDraft([]);
      loadAdmins({ silent: true });
    } catch {
      toast.error('Failed to grant access');
    } finally {
      setSavingId(null);
    }
  }

  async function savePermissions(id) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/students/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: permDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save');
        return;
      }
      toast.success('Permissions updated');
      // Merge the returned permissions into local state.
      setAdmins((prev) =>
        prev
          .map((a) =>
            a._id === id ? { ...a, admin_permissions: data.admin_permissions } : a
          )
          // Drop sub-admins that had all permissions revoked so the list stays honest.
          .filter((a) => a.role === 'admin' || (a.admin_permissions && a.admin_permissions.length > 0))
      );
      setEditingId(null);
      setPermDraft([]);
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admins</h1>
          <p className="text-sm text-gray-500 mt-1">
            Everyone with admin capabilities. Super admins have full access; sub-admins have scoped permissions you can edit here.
          </p>
        </div>
        <button
          onClick={() => loadAdmins({ silent: true })}
          disabled={refreshing}
          className="flex items-center gap-1 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          <HiRefresh className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <HiShieldCheck className="text-red-600 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Super Admins</p>
              <p className="text-xl font-bold text-gray-900">{admins.filter((a) => a.role === 'admin').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <HiKey className="text-primary-600 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sub-Admins</p>
              <p className="text-xl font-bold text-gray-900">{admins.filter((a) => a.role !== 'admin').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <HiKey className="text-gray-600 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total With Access</p>
              <p className="text-xl font-bold text-gray-900">{admins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grant admin access — find any user (e.g. a lecturer who signed in
          with their email) and promote them to a sub-admin. */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <HiKey className="text-emerald-600 text-lg" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Grant admin access</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Search a signed-in user by email, name, or registration number and grant them admin tab access.
            </p>
          </div>
        </div>

        <form onSubmit={handleGrantSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={grantQuery}
              onChange={(e) => setGrantQuery(e.target.value)}
              placeholder="Search by email (e.g. lecturer@uni.lk), name, or reg no"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={grantSearching}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50"
          >
            {grantSearching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {grantSearched && !grantSearching && grantResults.length === 0 && (
          <p className="text-xs text-gray-500 mt-3">
            No matching users without admin access. If they already have permissions, edit them in the Sub-Admins list below.
          </p>
        )}

        {grantResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {grantResults.map((c) => {
              const isPromoting = grantingId === c._id;
              const isSaving = savingId === c._id;
              return (
                <div key={c._id} className="border border-gray-200 rounded-lg">
                  <div className="p-3 flex flex-wrap items-center gap-3">
                    <AdminAvatar admin={c} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {c.full_name || c.email || 'Unnamed user'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {[c.email, c.registration_no, c.department].filter(Boolean).join(' • ') || '—'}
                      </p>
                    </div>
                    {!isPromoting ? (
                      <button
                        type="button"
                        onClick={() => startGranting(c)}
                        className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-1"
                      >
                        <HiKey /> Grant access
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelGranting}
                          disabled={isSaving}
                          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <HiX /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveGrant(c._id)}
                          disabled={isSaving || grantDraft.length === 0}
                          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <HiCheck /> {isSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isPromoting && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">Select permissions</p>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => toggleGrantAll(true)}
                            className="text-primary-600 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGrantAll(false)}
                            className="text-red-600 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.map((opt) => {
                          const checked = grantDraft.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition text-sm ${
                                checked
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGrantPerm(opt.key)}
                                className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span>
                                <span className="block font-medium text-gray-800">{opt.label}</span>
                                <span className="block text-xs text-gray-500">{opt.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Any outstanding sessions for this user will be invalidated so the new access takes effect on next sign-in.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or registration number"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Super Admins */}
      {superAdmins.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Super Admins</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {superAdmins.map((a) => (
              <div key={a._id} className="p-4 flex items-center gap-3">
                <AdminAvatar admin={a} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {a.full_name || a.email || 'Unnamed admin'}
                    {a._id === user?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{a.email || a.registration_no || '—'}</p>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  Full access
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sub-Admins */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Sub-Admins</h2>
        {subAdmins.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            {query ? 'No matching sub-admins.' : 'No sub-admins yet. Grant permissions from the Students tab to promote a student.'}
          </div>
        ) : (
          <div className="space-y-3">
            {subAdmins.map((a) => {
              const isEditing = editingId === a._id;
              const perms = Array.isArray(a.admin_permissions) ? a.admin_permissions : [];
              const isSaving = savingId === a._id;
              return (
                <div key={a._id} className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 flex flex-wrap items-center gap-3">
                    <AdminAvatar admin={a} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {a.full_name || a.email || 'Unnamed student'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {[a.registration_no, a.email, a.department].filter(Boolean).join(' • ') || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-md">
                      {perms.length === 0 ? (
                        <span className="text-xs italic text-gray-400">No permissions</span>
                      ) : (
                        perms.map((p) => (
                          <span
                            key={p}
                            className="text-[11px] bg-primary-50 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={() => startEditing(a)}
                        className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-1"
                      >
                        <HiKey /> Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <HiX /> Cancel
                        </button>
                        <button
                          onClick={() => savePermissions(a._id)}
                          disabled={isSaving}
                          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <HiCheck /> {isSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-700">Permissions</p>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => toggleAll(true)}
                            className="text-primary-600 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAll(false)}
                            className="text-red-600 hover:underline"
                          >
                            Revoke all
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.map((opt) => {
                          const checked = permDraft.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition text-sm ${
                                checked
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePerm(opt.key)}
                                className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span>
                                <span className="block font-medium text-gray-800">{opt.label}</span>
                                <span className="block text-xs text-gray-500">{opt.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Removing all permissions will demote this student to a regular account and remove them from this list.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminAvatar({ admin }) {
  if (admin.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={admin.avatar}
        alt=""
        className="w-9 h-9 rounded-full shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = (admin.full_name || admin.email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
      {initial}
    </div>
  );
}
