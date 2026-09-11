import Job from '@/models/Job';
import User from '@/models/User';
import { POST as createJob } from '@/app/api/admin/jobs/route';
import { PUT as updateJob } from '@/app/api/admin/jobs/[id]/route';
import { GET as getPayments } from '@/app/api/admin/payments/route';
import { POST as uploadPayment } from '@/app/api/student/payment-slip/route';
import { formatDateTimeInput } from '@/lib/date-time';

jest.mock('../../src/lib/db', () => jest.fn());
jest.mock('../../src/lib/auth', () => ({
  requirePermission: jest.fn().mockResolvedValue({ id: 'admin1' }),
  authenticate: jest.fn(() => ({ id: 'student1' })),
  isValidObjectId: jest.fn(() => true),
  ADMIN_PERMISSIONS: { JOBS: 'jobs', PAYMENTS: 'payments' },
}));
jest.mock('../../src/lib/activity-log', () => ({ logActivity: jest.fn() }));
jest.mock('../../src/lib/cache', () => ({ invalidateCompanyCaches: jest.fn() }));
jest.mock('../../src/lib/email', () => ({ sendJobAlertEmails: jest.fn(), sendPaymentSlipReceivedEmail: jest.fn() }));
jest.mock('../../src/lib/settings', () => ({
  getSettings: jest.fn().mockResolvedValue({ payment_slip_enabled: true }),
  isPaymentSlipEnabledForDepartment: jest.fn(() => true),
}));
jest.mock('../../src/lib/google-drive', () => ({
  uploadPaymentSlipToDrive: jest.fn().mockResolvedValue({ fileId: 'slip1', webViewLink: 'https://example.com/slip' }),
}));
jest.mock('../../src/models/Job', () => ({ __esModule: true, default: { create: jest.fn(), findByIdAndUpdate: jest.fn() } }));
jest.mock('../../src/models/User', () => ({ __esModule: true, default: { find: jest.fn(), aggregate: jest.fn(), findById: jest.fn() } }));
jest.mock('../../src/models/Bid', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/models/Company', () => ({ __esModule: true, default: {} }));

function request(body) {
  return { json: async () => body };
}

describe('Sri Lanka deadline writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Job.create.mockImplementation(async (data) => ({ _id: 'job1', ...data }));
    Job.findByIdAndUpdate.mockImplementation(async (id, data) => ({ _id: id, ...data }));
    User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) });
  });

  test.each(['2026-09-11T18:00', '2026-09-11T18:00:00+05:30', '2026-09-11T12:30:00Z'])('creates and edits deadline %s without shifting its instant', async (deadline) => {
    const response = await createJob(request({ company_id: 'company1', title: 'Engineer', credit_cost: 10, deadline }));
    expect(response.status).toBe(201);
    const { job } = await response.json();
    expect(job.deadline).toBe('2026-09-11T12:30:00.000Z');
    const updated = await updateJob(request({ deadline: formatDateTimeInput(job.deadline) }), { params: { id: 'job1' } });
    expect(updated.status).toBe(200);
    expect((await updated.json()).job.deadline).toBe(job.deadline);
  });

  test('rejects invalid deadlines without writing', async () => {
    const response = await createJob(request({ company_id: 'company1', title: 'Engineer', credit_cost: 10, deadline: '2026-02-30T18:00' }));
    expect(response.status).toBe(400);
    expect(Job.create).not.toHaveBeenCalled();
    const updated = await updateJob(request({ deadline: 'invalid' }), { params: { id: 'job1' } });
    expect(updated.status).toBe(400);
    expect(Job.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('supports clearing or leaving a deadline unchanged', async () => {
    await updateJob(request({ deadline: null }), { params: { id: 'job1' } });
    expect(Job.findByIdAndUpdate.mock.calls[0][1].deadline).toBeNull();
    await updateJob(request({ is_closed: true }), { params: { id: 'job1' } });
    expect(Job.findByIdAndUpdate.mock.calls[1][1]).not.toHaveProperty('deadline');
  });
});

describe('Sri Lanka payment calendar days', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.find.mockReturnValue({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) });
    User.aggregate.mockResolvedValue([]);
  });

  test('filters a whole Colombo day including the previous UTC evening', async () => {
    const response = await getPayments({ url: 'http://localhost/api/admin/payments?from=2026-09-11&to=2026-09-11' });
    expect(response.status).toBe(200);
    const range = User.find.mock.calls[0][0].payment_slip_uploaded_at;
    expect(range.$gte.toISOString()).toBe('2026-09-10T18:30:00.000Z');
    expect(range.$lte.toISOString()).toBe('2026-09-11T18:29:59.999Z');
  });

  test.each(['from=2026-02-30', 'to=invalid', 'from=2026-09-12&to=2026-09-11'])('rejects invalid date ranges %s', async (query) => {
    const response = await getPayments({ url: `http://localhost/api/admin/payments?${query}` });
    expect(response.status).toBe(400);
    expect(User.find).not.toHaveBeenCalled();
  });

  test('accepts today just after Colombo midnight and rejects tomorrow', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T19:00:00Z'));
    try {
      const user = { registration_no: 'EG/2022/0001', department: 'COM', save: jest.fn() };
      User.findById.mockResolvedValue(user);
      const fields = new Map([
        ['payer_name', 'Student'], ['bank_name', 'Bank'], ['deposit_date', '2026-09-11'],
        ['slip', { type: 'application/pdf', size: 5, arrayBuffer: async () => Buffer.from('%PDF-') }],
      ]);
      const response = await uploadPayment({ formData: async () => fields });
      expect(response.status).toBe(200);
      expect(user.payment_details.deposit_date.toISOString()).toBe('2026-09-10T18:30:00.000Z');
      fields.set('deposit_date', '2026-09-12');
      const future = await uploadPayment({ formData: async () => fields });
      expect(future.status).toBe(400);
      expect((await future.json()).error).toContain('future');
    } finally {
      jest.useRealTimers();
    }
  });
});