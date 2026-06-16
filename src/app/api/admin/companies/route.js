import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import { requireAdmin, isValidObjectId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { invalidateCompanyCaches } from '@/lib/cache';

function isValidUrl(str) {
  if (!str) return true;
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    requireAdmin(request);
    await dbConnect();
    const companies = await Company.find().sort({ created_at: -1 });
    return NextResponse.json({ companies });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = requireAdmin(request);
    await dbConnect();

    const { name, logo, website } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (name.length > 200) {
      return NextResponse.json({ error: 'Company name is too long' }, { status: 400 });
    }

    if (logo && (typeof logo !== 'string' || logo.length > 500 || !isValidUrl(logo))) {
      return NextResponse.json({ error: 'Invalid logo URL' }, { status: 400 });
    }

    if (website && (typeof website !== 'string' || website.length > 500 || !isValidUrl(website))) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    const company = await Company.create({ name: name.trim(), logo: logo || '', website: website || '' });
    await logActivity(admin.id, 'company_created', 'company', company._id, `Created company "${name}"`);
    await invalidateCompanyCaches();
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Company create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
