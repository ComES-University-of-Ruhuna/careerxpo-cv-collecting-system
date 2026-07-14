'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { HiUpload, HiDocumentText, HiPencil, HiCheck } from 'react-icons/hi';
import { DEPARTMENTS, getSubSpecializations } from '@/lib/departments';

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialForm = {
    registration_no: '',
    full_name: '',
    linkedin: '',
    department: '',
    sub_specialization: '',
    cv_consent: false,
  };
  const [form, setForm] = useState(initialForm);
  const [savedForm, setSavedForm] = useState(initialForm);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const departments = DEPARTMENTS;
  const subSpecializations = getSubSpecializations(form.department);
  const requiresSubSpecialization = subSpecializations.length > 0;

  useEffect(() => {
    if (user) {
      const next = {
        registration_no: user.registration_no || '',
        full_name: user.full_name || '',
        linkedin: user.linkedin || '',
        department: user.department || '',
        sub_specialization: user.sub_specialization || '',
        cv_consent: user.cv_consent || false,
      };
      setForm(next);
      setSavedForm(next);
    }
  }, [user]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Profile updated successfully!');
      updateUser(data.user);
      setSavedForm(form);

      const justActivated = !user?.profile_completed && data.user?.profile_completed;
      if (justActivated) {
        router.push('/student');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
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

    setUploading(true);
    const formData = new FormData();
    formData.append('cv', file);

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

      toast.success('CV uploaded successfully!');
      updateUser({ cv_url: data.cv_url, cv_drive_id: data.cv_drive_id });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {!user?.profile_completed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 font-medium">Complete your profile</p>
          <p className="text-sm text-amber-700 mt-1">
            Please add your registration number, full name, and department to complete your profile setup.
          </p>
        </div>
      )}

      {/* Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <HiPencil /> Profile Details
        </h2>

        {user?.email && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Email (Google)</label>
            <p className="text-gray-900 flex items-center gap-2">
              {user.avatar && (
                <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
              )}
              {user.email}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            value={form.registration_no}
            onChange={(e) => {
              let val = e.target.value.toUpperCase().replace(/[^A-Z0-9/]/g, '');
              // Auto-insert slashes: EG/XXXX/XXXX
              const digits = val.replace(/[^A-Z0-9]/g, '');
              if (digits.length <= 2) {
                val = digits;
              } else if (digits.length <= 6) {
                val = digits.slice(0, 2) + '/' + digits.slice(2);
              } else {
                val = digits.slice(0, 2) + '/' + digits.slice(2, 6) + '/' + digits.slice(6, 10);
              }
              setForm({ ...form, registration_no: val });
            }}
            maxLength={12}
            placeholder="EG/2021/1234"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
          <p className="text-xs text-gray-400 mt-1">Format: EG/20XX/XXXX (e.g., EG/2021/1234)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            value={form.department}
            onChange={(e) => {
              const nextDept = e.target.value;
              const nextOptions = getSubSpecializations(nextDept);
              setForm({
                ...form,
                department: nextDept,
                // Clear sub_specialization if it isn't valid for the new department.
                sub_specialization: nextOptions.includes(form.sub_specialization)
                  ? form.sub_specialization
                  : '',
              });
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          >
            <option value="">Select your department</option>
            {departments.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {form.department && requiresSubSpecialization && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-specialization *</label>
            <select
              value={form.sub_specialization}
              onChange={(e) => setForm({ ...form, sub_specialization: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            >
              <option value="">Select your sub-specialization</option>
              {subSpecializations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
          <input
            type="url"
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/yourprofile"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.cv_consent}
              onChange={(e) => setForm({ ...form, cv_consent: e.target.checked })}
              className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              I agree to share my CV and profile information with companies I bid on through CareerXpo. 
              I understand that my data will be handled in accordance with the{' '}
              <a href="/privacy" target="_blank" className="text-primary-600 hover:underline">Privacy Policy</a>{' '}
              and{' '}
              <a href="/terms" target="_blank" className="text-primary-600 hover:underline">Terms of Service</a>.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={
            saving ||
            !isDirty ||
            !form.cv_consent ||
            (requiresSubSpecialization && !form.sub_specialization)
          }
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <HiCheck />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mb-6">
        <div className="flex justify-between">
          <div>
            <label className="text-sm font-medium text-gray-500">Remaining Credits</label>
            <p className="text-lg font-semibold text-primary-600 mt-1">{user?.remaining_credits ?? 0} credits</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Account Created</label>
            <p className="text-gray-900 mt-1">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Basic Resume Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HiDocumentText /> Basic Resume
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a general resume. You can also upload company-specific resumes when you bid on companies.
        </p>

        {user?.cv_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-700 font-medium">Basic Resume Uploaded ✓</p>
            <a
              href={user.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:underline"
            >
              View on Google Drive →
            </a>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-700">No basic resume uploaded yet. Please upload your resume in PDF format.</p>
          </div>
        )}

        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm">
          <HiUpload />
          {uploading ? 'Uploading...' : user?.cv_url ? 'Re-upload Resume' : 'Upload Resume (PDF)'}
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">
          PDF only, max 5MB.
        </p>
      </div>
    </div>
  );
}
