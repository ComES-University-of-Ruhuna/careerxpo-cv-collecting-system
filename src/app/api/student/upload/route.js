import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Bid from '@/models/Bid';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { authenticate } from '@/lib/auth';
import { uploadCVToDrive } from '@/lib/google-drive';

export async function POST(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(decoded.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.registration_no || !user.full_name) {
      return NextResponse.json({ error: 'Please complete your profile (name and registration number) before uploading.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('cv');
    const jobId = formData.get('job_id');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate PDF magic bytes (%PDF)
    if (buffer.length < 4 || buffer.slice(0, 4).toString() !== '%PDF') {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
    }

    if (jobId) {
      // Per-job CV upload — upload before or after bidding
      const job = await Job.findById(jobId).populate('company_id', 'name');
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

      const { fileId, webViewLink } = await uploadCVToDrive(buffer, user.registration_no, user.full_name, job.company_id.name, job.title);

      // If a bid already exists, attach the CV to it
      const bid = await Bid.findOne({ user_id: decoded.id, job_id: jobId });
      if (bid) {
        bid.cv_drive_id = fileId;
        bid.cv_url = webViewLink;
        await bid.save();
      }

      return NextResponse.json({
        message: 'Resume uploaded successfully',
        cv_url: webViewLink,
        cv_drive_id: fileId,
        job_id: jobId,
      });
    } else {
      // Basic resume upload
      const { fileId, webViewLink } = await uploadCVToDrive(buffer, user.registration_no, user.full_name, null, null);

      user.cv_drive_id = fileId;
      user.cv_url = webViewLink;
      await user.save();

      return NextResponse.json({
        message: 'Basic resume uploaded successfully',
        cv_url: webViewLink,
        cv_drive_id: fileId,
      });
    }
  } catch (error) {
    console.error('Upload error:', error?.message || error);
    if (error?.response?.data) {
      console.error('Google API error:', JSON.stringify(error.response.data));
    }
    const msg = error?.message || 'Failed to upload CV. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
