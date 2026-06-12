process.env.JWT_SECRET = 'test-secret-key';

import { authenticate, isValidObjectId } from '../../src/lib/auth';
import dbConnect from '../../src/lib/db';
import User from '../../src/models/User';
import Job from '../../src/models/Job';
import Bid from '../../src/models/Bid';
import Company from '../../src/models/Company';
import { sendBidConfirmationEmail } from '../../src/lib/email';
import { POST } from '../../src/app/api/student/bids/route';

jest.mock('../../src/lib/auth');
jest.mock('../../src/lib/db', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../../src/models/User');
jest.mock('../../src/models/Job');
jest.mock('../../src/models/Bid');
jest.mock('../../src/models/Company');
jest.mock('../../src/lib/email');

function createRequest(body = {}) {
  return {
    headers: { get: jest.fn() },
    cookies: { get: jest.fn() },
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('POST /api/student/bids', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    authenticate.mockReturnValue(null);
    const res = await POST(createRequest({ job_id: 'abc' }));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid job_id', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(false);
    const res = await POST(createRequest({ job_id: 'bad-id' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Valid Job ID/);
  });

  it('should return 409 for duplicate bid', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue({ _id: 'existing-bid' });

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already bid/);
  });

  it('should return 404 if job not found', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue(null);

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('should return 400 if job is closed', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({ is_closed: true, credit_cost: 10 });

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/closed/);
  });

  it('should return 400 if deadline has passed', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({
      is_closed: false,
      deadline: new Date('2020-01-01'),
      credit_cost: 10,
    });

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/deadline/);
  });

  it('should return 400 if max applicants reached', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({
      is_closed: false,
      deadline: null,
      max_applicants: 2,
      credit_cost: 10,
    });
    Bid.countDocuments.mockResolvedValue(2);

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/maximum/);
  });

  it('should return 400 if insufficient credits', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({
      is_closed: false,
      deadline: null,
      max_applicants: null,
      credit_cost: 50,
    });
    User.findOneAndUpdate.mockResolvedValue(null);

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Insufficient credits/);
  });

  it('should create bid and return 201 on success', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({
      is_closed: false,
      deadline: null,
      max_applicants: null,
      credit_cost: 10,
      company_id: 'comp1',
      title: 'Dev',
    });
    User.findOneAndUpdate.mockResolvedValue({ _id: 'user1', email: 'test@test.com', full_name: 'Test', remaining_credits: 90, cv_url: null });
    Bid.create.mockResolvedValue({ _id: 'bid1', user_id: 'user1', job_id: 'job1', credits_spent: 10 });
    Company.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'TestCo' }) });
    sendBidConfirmationEmail.mockResolvedValue(undefined);

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.message).toBe('Bid placed successfully');
    expect(data.remaining_credits).toBe(90);
    expect(sendBidConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        jobTitle: 'Dev',
        companyName: 'TestCo',
      })
    );
  });

  it('should refund credits on duplicate key error (race condition)', async () => {
    authenticate.mockReturnValue({ id: 'user1' });
    isValidObjectId.mockReturnValue(true);
    Bid.findOne.mockResolvedValue(null);
    Job.findById.mockResolvedValue({
      is_closed: false,
      deadline: null,
      max_applicants: null,
      credit_cost: 10,
    });
    User.findOneAndUpdate.mockResolvedValue({ _id: 'user1', remaining_credits: 90 });
    Bid.create.mockRejectedValue({ code: 11000 });
    User.findByIdAndUpdate.mockResolvedValue({});

    const res = await POST(createRequest({ job_id: '507f1f77bcf86cd799439011' }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { $inc: { remaining_credits: 10 } });
  });
});
