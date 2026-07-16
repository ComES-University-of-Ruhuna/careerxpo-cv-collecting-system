'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiX, HiDownload } from 'react-icons/hi';
import { DEPARTMENTS } from '@/lib/departments';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All submitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const COLUMNS = [
  { header: 'Full Name', get: (s) => s.full_name || '' },
  { header: 'Email', get: (s) => s.email || '' },
  { header: 'Registration No', get: (s) => s.registration_no || '' },
  { header: 'Department', get: (s) => s.department || '' },
  { header: 'Status', get: (s) => s.payment_slip_status || '' },
  { header: 'Bank', get: (s) => s.payment_details?.bank_name || '' },
  { header: 'Branch', get: (s) => s.payment_details?.branch || '' },
  { header: 'Slip No', get: (s) => s.payment_details?.slip_no || '' },
  { header: 'Reference No', get: (s) => s.payment_details?.reference_no || '' },
  { header: 'Payer Name', get: (s) => s.payment_details?.payer_name || '' },
  { header: 'Amount (LKR)', get: (s) => s.payment_details?.amount ?? '' },
  {
    header: 'Deposit Date',
    get: (s) =>
      s.payment_details?.deposit_date
        ? new Date(s.payment_details.deposit_date).toLocaleDateString()
        : '',
  },
  {
    header: 'Submitted At',
    get: (s) =>
      s.payment_slip_uploaded_at
        ? new Date(s.payment_slip_uploaded_at).toLocaleString()
        : '',
  },
  { header: 'Slip URL', get: (s) => s.payment_slip_url || '' },
  { header: 'Notes', get: (s) => s.payment_details?.notes || '' },
];

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

async function exportToXlsx(rows, fileBase) {
  const XLSX = await import('xlsx');
  const aoa = [COLUMNS.map((c) => c.header), ...rows.map((r) => COLUMNS.map((c) => c.get(r)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto width estimate.
  ws['!cols'] = COLUMNS.map((c, idx) => {
    const maxLen = aoa.reduce((max, row) => {
      const val = row[idx];
      const len = val == null ? 0 : String(val).length;
      return Math.max(max, len);
    }, c.header.length);
    return { wch: Math.min(60, Math.max(10, maxLen + 2)) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

async function exportToPdf(rows, fileBase, meta) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  // PDF is width-limited — pick a compact subset of columns.
  const pdfCols = [
    'Full Name',
    'Reg No',
    'Dept',
    'Status',
    'Bank',
    'Slip No',
    'Ref No',
    'Amount',
    'Deposit',
    'Submitted',
  ];
  const pdfBody = rows.map((s) => [
    s.full_name || '',
    s.registration_no || '',
    s.department || '',
    s.payment_slip_status || '',
    s.payment_details?.bank_name || '',
    s.payment_details?.slip_no || '',
    s.payment_details?.reference_no || '',
    s.payment_details?.amount ?? '',
    s.payment_details?.deposit_date
      ? new Date(s.payment_details.deposit_date).toLocaleDateString()
      : '',
    s.payment_slip_uploaded_at
      ? new Date(s.payment_slip_uploaded_at).toLocaleDateString()
      : '',
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('CareerXpo — Payment Slips', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Exported: ${new Date().toLocaleString()} · Status: ${meta.status} · Department: ${
      meta.department || 'All'
    } · Rows: ${rows.length}`,
    40,
    58
  );

  autoTable(doc, {
    startY: 75,
    head: [pdfCols],
    body: pdfBody,
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${fileBase}.pdf`);
}

export default function ExportPaymentsModal({ open, onClose, token }) {
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('all');
  const [format, setFormat] = useState('xlsx');
  const [busy, setBusy] = useState(false);

  // Reset each time the modal is opened so a previous run doesn't linger.
  useEffect(() => {
    if (open) {
      setDepartment('');
      setStatus('all');
      setFormat('xlsx');
      setBusy(false);
    }
  }, [open]);

  const fileBase = useMemo(() => {
    const parts = ['payments', status, department || 'all-depts', todayStamp()];
    return parts.filter(Boolean).join('_');
  }, [status, department]);

  if (!open) return null;

  async function handleExport() {
    if (!token) {
      toast.error('Not authenticated.');
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      if (department) params.set('department', department);
      params.set('limit', '500');
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load payments');
        return;
      }
      const rows = data.submissions || [];
      if (rows.length === 0) {
        toast.error('No matching payment records to export.');
        return;
      }

      if (format === 'pdf') {
        await exportToPdf(rows, fileBase, { status, department });
      } else {
        await exportToXlsx(rows, fileBase);
      }

      toast.success(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}.`);
      onClose?.();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export Payments</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <HiX className="text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">File format</span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${
                  format === 'xlsx'
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  disabled={busy}
                  className="accent-primary-600"
                />
                <span>Excel (.xlsx)</span>
              </label>
              <label
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm ${
                  format === 'pdf'
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  disabled={busy}
                  className="accent-primary-600"
                />
                <span>PDF (.pdf)</span>
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Up to 500 most recent matching submissions are exported.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <HiDownload />
            {busy ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
