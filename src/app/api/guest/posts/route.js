import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GuestPost from '@/models/GuestPost';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidUrl } from '@/lib/validation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s\-()]{6,19}$/;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await rateLimit(`guest-post:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    await dbConnect();
    const body = await request.json();

    const { contact_name, contact_email, contact_phone, company_name, company_website, company_logo, job_title, job_description, departments, max_applicants, deadline } = body;

    // Validate required fields
    if (!contact_name?.trim() || !contact_email?.trim() || !contact_phone?.trim()) {
      return NextResponse.json({ error: 'Contact name, email, and phone number are required.' }, { status: 400 });
    }
    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!job_title?.trim()) {
      return NextResponse.json({ error: 'Job title is required.' }, { status: 400 });
    }

    // Validate formats
    if (!EMAIL_REGEX.test(contact_email.trim())) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!PHONE_REGEX.test(contact_phone.trim())) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    // Length limits
    if (contact_name.trim().length > 100) {
      return NextResponse.json({ error: 'Contact name is too long (max 100 characters).' }, { status: 400 });
    }
    if (company_name.trim().length > 150) {
      return NextResponse.json({ error: 'Company name is too long (max 150 characters).' }, { status: 400 });
    }
    if (job_title.trim().length > 200) {
      return NextResponse.json({ error: 'Job title is too long (max 200 characters).' }, { status: 400 });
    }
    if (job_description && job_description.length > 5000) {
      return NextResponse.json({ error: 'Job description is too long (max 5000 characters).' }, { status: 400 });
    }

    // Validate URL if provided — allow only http(s) schemes so we do not
    // persist javascript:, data:, or other scheme-injection payloads that
    // would later be rendered as clickable links to admins and students.
    if (company_website?.trim() && !isValidUrl(company_website.trim())) {
      return NextResponse.json({ error: 'Invalid company website URL.' }, { status: 400 });
    }
    if (company_logo?.trim() && !isValidUrl(company_logo.trim())) {
      return NextResponse.json({ error: 'Invalid company logo URL.' }, { status: 400 });
    }

    // Validate departments
    const validDepts = ['DEIE', 'DMME', 'COM', 'DCEE', 'DMENA'];
    if (departments && !Array.isArray(departments)) {
      return NextResponse.json({ error: 'Departments must be an array.' }, { status: 400 });
    }
    if (departments?.some((d) => !validDepts.includes(d))) {
      return NextResponse.json({ error: 'Invalid department selected.' }, { status: 400 });
    }

    const post = await GuestPost.create({
      contact_name: contact_name.trim(),
      contact_email: contact_email.trim().toLowerCase(),
      contact_phone: contact_phone.trim(),
      company_name: company_name.trim(),
      company_website: company_website?.trim() || '',
      company_logo: company_logo?.trim() || '',
      job_title: job_title.trim(),
      job_description: job_description?.trim() || '',
      departments: departments || [],
      max_applicants: max_applicants && Number(max_applicants) > 0 ? Number(max_applicants) : null,
      deadline: deadline ? new Date(deadline) : null,
    });

    return NextResponse.json({
      message: 'Your job vacancy has been submitted for review. You will be notified once it is approved.',
      post: { _id: post._id, status: post.status },
    }, { status: 201 });
  } catch (error) {
    console.error('Guest post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
