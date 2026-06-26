import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GuestPost from '@/models/GuestPost';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { requirePermission, isValidObjectId, ADMIN_PERMISSIONS } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request, { params }) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.GUEST_POSTS);
    const { id } = params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await dbConnect();
    const post = await GuestPost.findById(id);
    if (!post) return NextResponse.json({ error: 'Guest post not found' }, { status: 404 });

    return NextResponse.json({ post });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const admin = await requirePermission(request, ADMIN_PERMISSIONS.GUEST_POSTS);
    const { id } = params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await dbConnect();
    const post = await GuestPost.findById(id);
    if (!post) return NextResponse.json({ error: 'Guest post not found' }, { status: 404 });

    const body = await request.json();
    const { action, credit_cost, admin_note } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approve" or "reject".' }, { status: 400 });
    }

    if (post.status !== 'pending') {
      return NextResponse.json({ error: `This post has already been ${post.status}.` }, { status: 400 });
    }

    if (action === 'approve') {
      if (!credit_cost || credit_cost < 1) {
        return NextResponse.json({ error: 'Credit cost is required and must be at least 1.' }, { status: 400 });
      }

      // Create or find company
      let company = await Company.findOne({ name: post.company_name });
      if (!company) {
        company = await Company.create({
          name: post.company_name,
          logo: post.company_logo,
          website: post.company_website,
        });
      }

      // Create the job vacancy
      const job = await Job.create({
        company_id: company._id,
        title: post.job_title,
        description: post.job_description,
        credit_cost: Number(credit_cost),
        departments: post.departments,
        max_applicants: post.max_applicants,
        deadline: post.deadline,
      });

      post.status = 'approved';
      post.credit_cost = Number(credit_cost);
      post.admin_note = admin_note || '';
      post.reviewed_by = admin.id;
      post.reviewed_at = new Date();
      await post.save();

      await logActivity(admin.id, 'guest_post_approved', 'guest_post', id, `Approved "${post.job_title}" at ${post.company_name} (${credit_cost} credits)`);

      return NextResponse.json({ message: 'Guest post approved and job created.', job, company });
    }

    // Reject
    post.status = 'rejected';
    post.admin_note = admin_note || '';
    post.reviewed_by = admin.id;
    post.reviewed_at = new Date();
    await post.save();

    await logActivity(admin.id, 'guest_post_rejected', 'guest_post', id, `Rejected "${post.job_title}" at ${post.company_name}`);

    return NextResponse.json({ message: 'Guest post rejected.' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Guest post review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePermission(request, ADMIN_PERMISSIONS.GUEST_POSTS);
    const { id } = params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await dbConnect();
    const post = await GuestPost.findByIdAndDelete(id);
    if (!post) return NextResponse.json({ error: 'Guest post not found' }, { status: 404 });

    return NextResponse.json({ message: 'Guest post deleted.' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
