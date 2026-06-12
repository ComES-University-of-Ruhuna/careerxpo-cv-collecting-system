process.env.JWT_SECRET = 'test-secret-key';

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { signToken, verifyToken, isValidObjectId, getTokenFromRequest, authenticate, requireAuth, requireAdmin } from '@/lib/auth';

jest.mock('jsonwebtoken');
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}));

describe('Auth Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signToken', () => {
    it('should throw when JWT_SECRET is not configured', () => {
      expect(() => signToken({ userId: '123' })).toThrow('JWT_SECRET is not configured');
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for valid token', () => {
      const decoded = { userId: '123', role: 'student' };
      jwt.verify.mockReturnValue(decoded);
      expect(verifyToken('valid-token')).toEqual(decoded);
    });

    it('should return null for invalid token', () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
      expect(verifyToken('bad-token')).toBeNull();
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid ObjectId', () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should return false for invalid ObjectId', () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      expect(isValidObjectId('invalid')).toBe(false);
    });
  });

  describe('getTokenFromRequest', () => {
    it('should extract Bearer token from Authorization header', () => {
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer abc.def.ghi' : null) },
        cookies: { get: jest.fn() },
      };
      expect(getTokenFromRequest(request)).toBe('abc.def.ghi');
    });

    it('should fall back to cookie when no Authorization header', () => {
      const request = {
        headers: { get: jest.fn(() => null) },
        cookies: { get: jest.fn(() => ({ value: 'cookie-token' })) },
      };
      expect(getTokenFromRequest(request)).toBe('cookie-token');
    });

    it('should return null when no token found', () => {
      const request = {
        headers: { get: jest.fn(() => null) },
        cookies: { get: jest.fn(() => null) },
      };
      expect(getTokenFromRequest(request)).toBeNull();
    });

    it('should ignore Bearer tokens without a dot', () => {
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer notajwt' : null) },
        cookies: { get: jest.fn(() => ({ value: 'cookie-token' })) },
      };
      expect(getTokenFromRequest(request)).toBe('cookie-token');
    });
  });

  describe('authenticate', () => {
    it('should return decoded user for valid token', () => {
      const decoded = { userId: '123' };
      jwt.verify.mockReturnValue(decoded);
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer a.b.c' : null) },
        cookies: { get: jest.fn() },
      };
      expect(authenticate(request)).toEqual(decoded);
    });

    it('should return null when no token', () => {
      const request = {
        headers: { get: jest.fn(() => null) },
        cookies: { get: jest.fn(() => null) },
      };
      expect(authenticate(request)).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return user for valid token', () => {
      const decoded = { userId: '123', role: 'student' };
      jwt.verify.mockReturnValue(decoded);
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer a.b.c' : null) },
        cookies: { get: jest.fn() },
      };
      expect(requireAuth(request)).toEqual(decoded);
    });

    it('should throw for missing token', () => {
      const request = {
        headers: { get: jest.fn(() => null) },
        cookies: { get: jest.fn(() => null) },
      };
      expect(() => requireAuth(request)).toThrow('Unauthorized');
    });
  });

  describe('requireAdmin', () => {
    it('should return user for admin role', () => {
      const decoded = { userId: '123', role: 'admin' };
      jwt.verify.mockReturnValue(decoded);
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer a.b.c' : null) },
        cookies: { get: jest.fn() },
      };
      expect(requireAdmin(request)).toEqual(decoded);
    });

    it('should throw Forbidden for non-admin role', () => {
      const decoded = { userId: '123', role: 'student' };
      jwt.verify.mockReturnValue(decoded);
      const request = {
        headers: { get: jest.fn((h) => h === 'authorization' ? 'Bearer a.b.c' : null) },
        cookies: { get: jest.fn() },
      };
      expect(() => requireAdmin(request)).toThrow('Forbidden');
    });
  });
});
