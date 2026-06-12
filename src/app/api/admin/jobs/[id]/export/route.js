import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Bid from '@/models/Bid';
import { requireAdmin, isValidObjectId } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    if (!isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    requireAdmin(request);
    await dbConnect();

    const job = await Job.findById(params.id).populate('company_id', 'name');
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const bids = await Bid.find({ job_id: params.id })
      .populate('user_id', 'full_name registration_no email department')
      .sort({ timestamp: 1 });

    const rows = bids.map((bid, i) => ({
      '#': i + 1,
      'Name': bid.user_id?.full_name || '',
      'Registration No': bid.user_id?.registration_no || '',
      'Email': bid.user_id?.email || '',
      'Department': bid.user_id?.department || '',
      'CV Link': bid.cv_url || '',
      'Applied At': bid.timestamp ? new Date(bid.timestamp).toLocaleString('en-US') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const safeTitle = job.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeTitle || 'Applications');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const companyName = job.company_id?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Company';
    const jobTitle = job.title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${companyName}_${jobTitle}_Applications.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
