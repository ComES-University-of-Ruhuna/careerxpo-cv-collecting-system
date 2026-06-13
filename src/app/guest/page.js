'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { HiAcademicCap, HiBriefcase, HiMail, HiPhone, HiUser, HiOfficeBuilding, HiGlobe, HiDocumentText, HiCalendar, HiUserGroup, HiCheckCircle } from 'react-icons/hi';
import Footer from '@/components/Footer';

const DEPARTMENTS = [
  { value: 'DEIE', label: 'Electrical & Information Engineering' },
  { value: 'DMME', label: 'Mechanical & Manufacturing Engineering' },
  { value: 'COM', label: 'Computer Engineering' },
  { value: 'DCEE', label: 'Civil & Environmental Engineering' },
  { value: 'DMENA', label: 'Metallurgical & Materials Engineering' },
];

export default function GuestPostPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    company_name: '',
    company_website: '',
    company_logo: '',
    job_title: '',
    job_description: '',
    departments: [],
    max_applicants: '',
    deadline: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDept = (dept) => {
    setForm((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/guest/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_applicants: form.max_applicants ? Number(form.max_applicants) : null,
          deadline: form.deadline || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Toaster />
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-primary-600">
              <HiAcademicCap className="text-2xl" />
              <span className="font-bold text-xl text-gray-900">CareerXpo 3.0</span>
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <HiCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Submission Received!</h1>
            <p className="text-gray-600 mb-6">
              Your job vacancy has been submitted for review. Our admin team will review it and set the appropriate credit value. You will be notified at your provided email once approved.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setSubmitted(false); setForm({ contact_name: '', contact_email: '', contact_phone: '', company_name: '', company_website: '', company_logo: '', job_title: '', job_description: '', departments: [], max_applicants: '', deadline: '' }); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                Submit Another
              </button>
              <Link href="/" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster />
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-primary-600">
            <HiAcademicCap className="text-2xl" />
            <span className="font-bold text-xl text-gray-900">CareerXpo 3.0</span>
          </Link>
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Sign In →
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-3">
              <HiBriefcase />
              Guest Posting
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Job Vacancy</h1>
            <p className="text-gray-500">Submit your job opening for the Career Fair. It will be reviewed and published by our admin team.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiUser className="text-primary-600" />
                Contact Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" name="contact_name" value={form.contact_name} onChange={handleChange} required maxLength={100} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="john@company.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <div className="relative">
                    <HiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" name="contact_phone" value={form.contact_phone} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="+94 77 123 4567" />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiOfficeBuilding className="text-primary-600" />
                Company Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" name="company_name" value={form.company_name} onChange={handleChange} required maxLength={150} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Acme Corporation" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <div className="relative">
                      <HiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="url" name="company_website" value={form.company_website} onChange={handleChange} className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="https://company.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input type="url" name="company_logo" value={form.company_logo} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="https://company.com/logo.png" />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiDocumentText className="text-primary-600" />
                Job Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input type="text" name="job_title" value={form.job_title} onChange={handleChange} required maxLength={200} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Software Engineer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="job_description" value={form.job_description} onChange={handleChange} rows={5} maxLength={5000} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Describe the role, requirements, and qualifications... (Markdown supported)" />
                  <p className="text-xs text-gray-400 mt-1">{form.job_description.length}/5000 characters • Markdown supported</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Departments</label>
                  <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((dept) => (
                      <button key={dept.value} type="button" onClick={() => toggleDept(dept.value)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${form.departments.includes(dept.value) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {dept.value}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave empty for all departments</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Applicants</label>
                    <div className="relative">
                      <HiUserGroup className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" name="max_applicants" value={form.max_applicants} onChange={handleChange} min={1} className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Unlimited" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                    <div className="relative">
                      <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="datetime-local" name="deadline" value={form.deadline} onChange={handleChange} className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Note:</strong> Your submission will be reviewed by the admin team. The credit cost for students to apply will be set during the approval process.
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg">
              {loading ? 'Submitting...' : 'Submit Job Vacancy'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
