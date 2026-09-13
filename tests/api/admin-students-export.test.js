jest.mock('../../src/lib/db', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../../src/lib/auth', () => ({
  requirePermission: jest.fn().mockResolvedValue({ role: 'admin' }),
  ADMIN_PERMISSIONS: { STUDENTS: 'students' },
}));
jest.mock('../../src/models/User', () => ({ __esModule: true, default: { find: jest.fn(), countDocuments: jest.fn() } }));
jest.mock('../../src/models/Bid', () => ({ __esModule: true, default: { aggregate: jest.fn() } }));
jest.mock('../../src/models/Job', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../../src/models/Company', () => ({ __esModule: true, default: {} }));

import { GET } from '../../src/app/api/admin/students/route';
import { requirePermission } from '../../src/lib/auth';
import User from '../../src/models/User';
import Bid from '../../src/models/Bid';
import Job from '../../src/models/Job';

describe('admin student export', () => {
  let studentQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    requirePermission.mockResolvedValue({ role: 'admin' });
    studentQuery = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'student1', full_name: 'Alex' }, { _id: 'student2' }]),
    };
    User.find.mockReturnValue(studentQuery);
    User.countDocuments.mockResolvedValue(250);
    Bid.aggregate.mockResolvedValue([{ _id: 'student1', count: 2, job_ids: ['job1', 'job2'] }]);
    Job.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'job1', title: 'Engineer', company_id: { _id: 'company1', name: 'Acme' } },
        { _id: 'job2', title: 'Engineer', company_id: null },
      ]),
    });
  });

  it('exports every matching student with bid job IDs and company-labelled openings', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/students?export=1&department=COM&sort=name&page=3&limit=25' });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), 'students');
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ role: 'student', department: 'COM', $or: expect.any(Array) }));
    expect(studentQuery.limit).toHaveBeenCalledWith(0);
    expect(studentQuery.sort).toHaveBeenCalledWith({ full_name: 1, _id: 1 });
    expect(studentQuery.skip).toHaveBeenCalledWith(0);
    expect(User.countDocuments).not.toHaveBeenCalled();
    expect(Bid.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      { $group: { _id: '$user_id', count: { $sum: 1 }, job_ids: { $addToSet: '$job_id' } } },
    ]));
    expect(data.students[0].bid_job_ids).toEqual(['job1', 'job2']);
    expect(data.students[1].bid_job_ids).toEqual([]);
    expect(data.jobs).toEqual([
      { _id: 'job1', title: 'Engineer', company_id: 'company1', company_name: 'Acme' },
      { _id: 'job2', title: 'Engineer', company_id: null, company_name: 'Unknown company' },
    ]);
  });

  it('keeps ordinary browse requests limited and does not load jobs', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/students' });
    const data = await response.json();
    expect(studentQuery.limit).toHaveBeenCalledWith(100);
    expect(studentQuery.skip).toHaveBeenCalledWith(0);
    expect(studentQuery.sort).toHaveBeenCalledWith({ created_at: -1, _id: -1 });
    expect(data.pagination).toEqual({ page: 1, limit: 100, total: 250, totalPages: 3 });
    expect(data.students[0]).not.toHaveProperty('bid_job_ids');
    expect(Job.find).not.toHaveBeenCalled();
  });

  it('returns the second page with the requested page size', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/students?page=2&limit=50' });
    expect(response.status).toBe(200);
    expect(studentQuery.skip).toHaveBeenCalledWith(50);
    expect(studentQuery.limit).toHaveBeenCalledWith(50);
    expect((await response.json()).pagination).toEqual({ page: 2, limit: 50, total: 250, totalPages: 5 });
  });

  it('counts the same department and eligible students used by the list query', async () => {
    User.countDocuments.mockResolvedValue(125);
    const response = await GET({ url: 'http://localhost/api/admin/students?department=COM&page=2' });
    expect(User.countDocuments).toHaveBeenCalledWith(User.find.mock.calls[0][0]);
    expect(User.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ department: 'COM', role: 'student', $or: expect.any(Array) }));
    expect((await response.json()).pagination).toEqual({ page: 2, limit: 100, total: 125, totalPages: 2 });
  });

  it('clamps pages beyond the end to the last available page', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/students?page=999' });
    expect(studentQuery.skip).toHaveBeenCalledWith(200);
    expect((await response.json()).pagination.page).toBe(3);
  });

  it('returns an empty first page when no students match', async () => {
    User.countDocuments.mockResolvedValue(0);
    studentQuery.lean.mockResolvedValue([]);
    const response = await GET({ url: 'http://localhost/api/admin/students?page=2' });
    expect((await response.json()).pagination).toEqual({ page: 1, limit: 100, total: 0, totalPages: 1 });
    expect(studentQuery.skip).toHaveBeenCalledWith(0);
    expect(Bid.aggregate).not.toHaveBeenCalled();
  });

  it.each([
    ['page=-3&limit=-5', 1, 1],
    ['page=oops&limit=oops', 1, 100],
    ['page=Infinity&limit=Infinity', 1, 100],
    ['page=2.9&limit=25.9', 2, 25],
    ['page=1&limit=9999', 1, 2000],
  ])('normalizes pagination parameters: %s', async (params, page, limit) => {
    const response = await GET({ url: `http://localhost/api/admin/students?${params}` });
    expect(response.status).toBe(200);
    expect((await response.json()).pagination).toEqual(expect.objectContaining({ page, limit }));
    expect(studentQuery.skip).toHaveBeenCalledWith((page - 1) * limit);
    expect(studentQuery.limit).toHaveBeenCalledWith(limit);
  });

  it('rejects invalid departments', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/students?export=1&department=INVALID' });
    expect(response.status).toBe(400);
    expect(User.find).not.toHaveBeenCalled();
  });

  it.each([['Unauthorized', 401], ['Forbidden', 403]])('rejects %s exports', async (message, code) => {
    requirePermission.mockRejectedValue(new Error(message));
    const response = await GET({ url: 'http://localhost/api/admin/students?export=1' });
    expect(response.status).toBe(code);
    expect(User.find).not.toHaveBeenCalled();
    expect(Job.find).not.toHaveBeenCalled();
  });
});