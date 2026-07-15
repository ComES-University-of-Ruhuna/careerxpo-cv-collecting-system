import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authenticate } from '@/lib/auth';
import { uploadPaymentSlipToDrive } from '@/lib/google-drive';

// Registration fee (LKR). Keep in sync with the amount shown in the UI.
const REGISTRATION_FEE_LKR = 500;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function magicBytesMatch(buffer, mime) {
  if (buffer.length < 4) return false;
  if (mime === 'application/pdf') {
    return buffer.slice(0, 4).toString() === '%PDF';
  }
  if (mime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/webp') {
    // "RIFF"...."WEBP"
    return (
      buffer.length >= 12 &&
      buffer.slice(0, 4).toString() === 'RIFF' &&
      buffer.slice(8, 12).toString() === 'WEBP'
    );
  }
  return false;
}

export async function GET(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(decoded.id).select(
      'payment_slip_drive_id payment_slip_url payment_slip_uploaded_at payment_slip_status payment_details'
    );
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      payment_slip_url: user.payment_slip_url,
      payment_slip_drive_id: user.payment_slip_drive_id,
      payment_slip_uploaded_at: user.payment_slip_uploaded_at,
      payment_slip_status: user.payment_slip_status,
      payment_details: user.payment_details || null,
      fee: REGISTRATION_FEE_LKR,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const decoded = authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(decoded.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.registration_no) {
      return NextResponse.json(
        { error: 'Please add your registration number in your profile before submitting the bank slip.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('slip');
    const payerName = (formData.get('payer_name') || '').toString().trim();
    const bankName = (formData.get('bank_name') || '').toString().trim();
    const branch = (formData.get('branch') || '').toString().trim();
    const depositDateRaw = (formData.get('deposit_date') || '').toString().trim();
    const referenceNo = (formData.get('reference_no') || '').toString().trim();
    const amountRaw = (formData.get('amount') || '').toString().trim();
    const notes = (formData.get('notes') || '').toString().trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Please attach your bank slip (PDF or image).' }, { status: 400 });
    }
    if (!payerName) {
      return NextResponse.json({ error: 'Payer name is required.' }, { status: 400 });
    }
    if (!bankName) {
      return NextResponse.json({ error: 'Bank name is required.' }, { status: 400 });
    }
    if (!depositDateRaw) {
      return NextResponse.json({ error: 'Deposit date is required.' }, { status: 400 });
    }
    const depositDate = new Date(depositDateRaw);
    if (Number.isNaN(depositDate.getTime())) {
      return NextResponse.json({ error: 'Invalid deposit date.' }, { status: 400 });
    }
    if (depositDate > new Date()) {
      return NextResponse.json({ error: 'Deposit date cannot be in the future.' }, { status: 400 });
    }

    const amount = amountRaw ? Number(amountRaw) : REGISTRATION_FEE_LKR;
    if (!Number.isFinite(amount) || amount < REGISTRATION_FEE_LKR) {
      return NextResponse.json(
        { error: `The registration fee is LKR ${REGISTRATION_FEE_LKR}. Please enter the correct amount.` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF or image files (JPG, PNG, WEBP) are accepted.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size must be under 5MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!magicBytesMatch(buffer, file.type)) {
      return NextResponse.json({ error: 'The uploaded file does not match its declared type.' }, { status: 400 });
    }

    const { fileId, webViewLink } = await uploadPaymentSlipToDrive(
      buffer,
      user.registration_no,
      file.type
    );

    user.payment_slip_drive_id = fileId;
    user.payment_slip_url = webViewLink;
    user.payment_slip_uploaded_at = new Date();
    user.payment_slip_status = 'pending';
    user.payment_details = {
      payer_name: payerName,
      bank_name: bankName,
      branch,
      deposit_date: depositDate,
      reference_no: referenceNo,
      amount,
      notes,
    };
    await user.save();

    return NextResponse.json({
      message: 'Bank slip submitted successfully. Your payment is pending verification.',
      payment_slip_url: webViewLink,
      payment_slip_drive_id: fileId,
      payment_slip_uploaded_at: user.payment_slip_uploaded_at,
      payment_slip_status: user.payment_slip_status,
      payment_details: user.payment_details,
    });
  } catch (error) {
    console.error('Payment slip upload error:', error?.message || error);
    if (error?.response?.data) {
      console.error('Google API error:', JSON.stringify(error.response.data));
    }
    const msg = error?.message || 'Failed to upload bank slip. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
