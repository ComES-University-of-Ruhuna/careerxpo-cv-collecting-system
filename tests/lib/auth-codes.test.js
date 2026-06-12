import crypto from 'crypto';
import { storeAuthCode, consumeAuthCode } from '@/lib/auth-codes';

jest.mock('crypto');

describe('Auth Codes Library', () => {
  let codeCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    codeCounter++;
    crypto.randomBytes.mockReturnValue({
      toString: () => `mock-code-${codeCounter}-${Date.now()}`,
    });
  });

  describe('storeAuthCode', () => {
    it('should return a code string', () => {
      const code = storeAuthCode('some-jwt-token');
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should generate unique codes', () => {
      crypto.randomBytes
        .mockReturnValueOnce({ toString: () => 'code-a' })
        .mockReturnValueOnce({ toString: () => 'code-b' });

      const code1 = storeAuthCode('token-1');
      const code2 = storeAuthCode('token-2');
      expect(code1).not.toBe(code2);
    });
  });

  describe('consumeAuthCode', () => {
    it('should return the token for a valid code', () => {
      crypto.randomBytes.mockReturnValue({ toString: () => 'valid-code-consume' });
      const code = storeAuthCode('my-jwt-token');
      const token = consumeAuthCode(code);
      expect(token).toBe('my-jwt-token');
    });

    it('should return null for the same code used twice', () => {
      crypto.randomBytes.mockReturnValue({ toString: () => 'one-time-code' });
      const code = storeAuthCode('my-jwt-token');
      consumeAuthCode(code);
      expect(consumeAuthCode(code)).toBeNull();
    });

    it('should return null for unknown code', () => {
      expect(consumeAuthCode('nonexistent-code')).toBeNull();
    });
  });
});
