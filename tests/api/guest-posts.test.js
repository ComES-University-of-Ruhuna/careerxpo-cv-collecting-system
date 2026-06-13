process.env.JWT_SECRET = 'test-secret-key';

import { rateLimit } from '../../src/lib/rate-limit';

// Mock rate-limit to always allow
jest.mock('../../src/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => ({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 })),
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('../../src/lib/db', () => jest.fn().mockResolvedValue(undefined));

const mockGuestPostCreate = jest.fn();
jest.mock('../../src/models/GuestPost', () => ({
  __esModule: true,
  default: { create: (...args) => mockGuestPostCreate(...args) },
}));

import { POST } from '../../src/app/api/guest/posts/route';

function createRequest(body = {}) {
  return {
    headers: { get: jest.fn((h) => h === 'x-forwarded-for' ? '127.0.0.1' : null) },
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('POST /api/guest/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });
  });

  it('should return 400 if contact name is missing', async () => {
    const res = await POST(createRequest({ contact_email: 'a@b.com', contact_phone: '123456789', company_name: 'Co', job_title: 'Dev' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Contact name/);
  });

  it('should return 400 if email is invalid', async () => {
    const res = await POST(createRequest({ contact_name: 'John', contact_email: 'notanemail', contact_phone: '123456789', company_name: 'Co', job_title: 'Dev' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('should return 400 if phone is invalid', async () => {
    const res = await POST(createRequest({ contact_name: 'John', contact_email: 'a@b.com', contact_phone: 'abc', company_name: 'Co', job_title: 'Dev' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/phone/i);
  });

  it('should return 400 if company name is missing', async () => {
    const res = await POST(createRequest({ contact_name: 'John', contact_email: 'a@b.com', contact_phone: '123456789', company_name: '', job_title: 'Dev' }));
    expect(res.status).toBe(400);
  });

  it('should return 400 if job title is missing', async () => {
    const res = await POST(createRequest({ contact_name: 'John', contact_email: 'a@b.com', contact_phone: '123456789', company_name: 'Co', job_title: '' }));
    expect(res.status).toBe(400);
  });

  it('should return 429 if rate limited', async () => {
    rateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });
    const res = await POST(createRequest({ contact_name: 'John', contact_email: 'a@b.com', contact_phone: '123456789', company_name: 'Co', job_title: 'Dev' }));
    expect(res.status).toBe(429);
  });

  it('should create guest post and return 201 on success', async () => {
    mockGuestPostCreate.mockResolvedValue({ _id: 'post1', status: 'pending' });
    const res = await POST(createRequest({
      contact_name: 'John Doe',
      contact_email: 'john@company.com',
      contact_phone: '+94771234567',
      company_name: 'TechCorp',
      company_website: 'https://techcorp.com',
      job_title: 'Software Engineer',
      job_description: 'Build stuff',
      departments: ['COM', 'DEIE'],
    }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toMatch(/submitted for review/);
    expect(mockGuestPostCreate).toHaveBeenCalledWith(expect.objectContaining({
      contact_name: 'John Doe',
      contact_email: 'john@company.com',
      company_name: 'TechCorp',
      job_title: 'Software Engineer',
    }));
  });

  it('should return 400 for invalid department', async () => {
    const res = await POST(createRequest({
      contact_name: 'John',
      contact_email: 'a@b.com',
      contact_phone: '123456789',
      company_name: 'Co',
      job_title: 'Dev',
      departments: ['INVALID'],
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/department/i);
  });
});
