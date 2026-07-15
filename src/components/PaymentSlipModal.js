'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiX, HiUpload, HiOutlineClipboardCopy, HiCheck } from 'react-icons/hi';

// Registration fee (LKR). Keep in sync with the API constant.
export const REGISTRATION_FEE_LKR = 500;

// Bank details displayed to the student. Update these to match your account.
// Values can be overridden per environment via NEXT_PUBLIC_BANK_* variables.
const BANK_DETAILS = {
  bankName: process.env.NEXT_PUBLIC_BANK_NAME || '[Bank Name]',
  branch: process.env.NEXT_PUBLIC_BANK_BRANCH || '[Branch]',
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'CareerXpo',
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '[Account Number]',
};

const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function PaymentSlipModal({ open, onClose, token, user, onSuccess }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({
    payer_name: user?.full_name || '',
    bank_name: '',
    branch: '',
    deposit_date: new Date().toISOString().slice(0, 10),
    reference_no: user?.registration_no || '',
    amount: REGISTRATION_FEE_LKR,
    notes: '',
  });

  if (!open) return null;

  function copyToClipboard(text, key) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    const okTypes = ACCEPTED_TYPES.split(',');
    if (!okTypes.includes(f.type)) {
      toast.error('Only PDF or image files (JPG, PNG, WEBP) are accepted.');
      e.target.value = '';
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      toast.error('File must be under 5MB.');
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      toast.error('Please attach your bank slip.');
      return;
    }
    if (!user?.registration_no) {
      toast.error('Add your registration number in your profile first.');
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('slip', file);
    fd.append('payer_name', form.payer_name);
    fd.append('bank_name', form.bank_name);
    fd.append('branch', form.branch);
    fd.append('deposit_date', form.deposit_date);
    fd.append('reference_no', form.reference_no);
    fd.append('amount', String(form.amount));
    fd.append('notes', form.notes);

    try {
      const res = await fetch('/api/student/payment-slip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit slip');
        return;
      }
      toast.success('Bank slip submitted!');
      onSuccess?.(data);
      onClose?.();
    } catch {
      toast.error('Failed to submit bank slip');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Submit Registration Fee Bank Slip</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <HiX className="text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-primary-800">Registration Fee: LKR {REGISTRATION_FEE_LKR}.00</p>
            <p className="text-xs text-primary-700 mt-1">
              Please deposit the fee to the account below and upload the bank slip. Use your registration number
              <span className="font-semibold"> ({user?.registration_no || 'add in profile'}) </span>
              as the payment reference on the slip.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Bank Details</p>
            <dl className="text-sm text-gray-700 space-y-1.5">
              <BankRow label="Bank" value={BANK_DETAILS.bankName} onCopy={() => copyToClipboard(BANK_DETAILS.bankName, 'bank')} copied={copied === 'bank'} />
              <BankRow label="Branch" value={BANK_DETAILS.branch} onCopy={() => copyToClipboard(BANK_DETAILS.branch, 'branch')} copied={copied === 'branch'} />
              <BankRow label="Account Name" value={BANK_DETAILS.accountName} onCopy={() => copyToClipboard(BANK_DETAILS.accountName, 'name')} copied={copied === 'name'} />
              <BankRow label="Account No." value={BANK_DETAILS.accountNumber} onCopy={() => copyToClipboard(BANK_DETAILS.accountNumber, 'acc')} copied={copied === 'acc'} />
              <BankRow
                label="Reference"
                value={user?.registration_no || '—'}
                onCopy={() => user?.registration_no && copyToClipboard(user.registration_no, 'ref')}
                copied={copied === 'ref'}
              />
            </dl>
            <p className="text-xs text-gray-500 mt-3">
              Include your registration number in the payment reference so we can match your slip.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Payer Name *">
                <input
                  type="text"
                  value={form.payer_name}
                  onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                  required
                  className="input"
                />
              </Field>
              <Field label="Depositor's Bank *">
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. Bank of Ceylon"
                  required
                  className="input"
                />
              </Field>
              <Field label="Branch">
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Deposit Date *">
                <input
                  type="date"
                  value={form.deposit_date}
                  onChange={(e) => setForm({ ...form, deposit_date: e.target.value })}
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  className="input"
                />
              </Field>
              <Field label="Reference / Slip No.">
                <input
                  type="text"
                  value={form.reference_no}
                  onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Amount (LKR) *">
                <input
                  type="number"
                  min={REGISTRATION_FEE_LKR}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  className="input"
                />
              </Field>
            </div>

            <Field label="Notes (optional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="input"
              />
            </Field>

            <Field label="Bank Slip (PDF or image) *">
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                required
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG, or WEBP. Max 5MB. The file will be saved as
                <span className="font-mono"> PaymentSlip_{(user?.registration_no || 'REGNO').replace(/\//g, '_')}</span>.
              </p>
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !user?.registration_no}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiUpload />
                {submitting ? 'Submitting...' : 'Submit Bank Slip'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          outline: none;
          font-size: 0.875rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus) {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgb(99 102 241 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function BankRow({ label, value, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2 min-w-0">
        <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
        <dd className="font-medium text-gray-900 truncate">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="text-gray-400 hover:text-primary-600 shrink-0"
        aria-label={`Copy ${label}`}
      >
        {copied ? <HiCheck className="text-green-600" /> : <HiOutlineClipboardCopy />}
      </button>
    </div>
  );
}
