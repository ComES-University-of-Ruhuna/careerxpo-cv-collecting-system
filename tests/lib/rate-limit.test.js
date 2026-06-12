import { rateLimit, getClientIp } from '@/lib/rate-limit';

describe('Rate Limit Library', () => {
  describe('rateLimit', () => {
    it('should allow requests within the limit', () => {
      const key = 'test-allow-' + Date.now();
      const result = rateLimit(key, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests exceeding the limit', () => {
      const key = 'test-block-' + Date.now();
      for (let i = 0; i < 3; i++) {
        rateLimit(key, 3, 60000);
      }
      const result = rateLimit(key, 3, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track remaining count correctly', () => {
      const key = 'test-remaining-' + Date.now();
      expect(rateLimit(key, 5, 60000).remaining).toBe(4);
      expect(rateLimit(key, 5, 60000).remaining).toBe(3);
      expect(rateLimit(key, 5, 60000).remaining).toBe(2);
    });

    it('should reset after window expires', () => {
      const key = 'test-reset-' + Date.now();
      const r1 = rateLimit(key, 1, 1); // 1ms window
      expect(r1.allowed).toBe(true);

      // Busy-wait for window to expire
      const start = Date.now();
      while (Date.now() - start < 5) {}

      const r2 = rateLimit(key, 1, 1);
      expect(r2.allowed).toBe(true);
    });

    it('should use different counters for different keys', () => {
      const key1 = 'test-key1-' + Date.now();
      const key2 = 'test-key2-' + Date.now();
      rateLimit(key1, 1, 60000);
      expect(rateLimit(key1, 1, 60000).allowed).toBe(false);
      expect(rateLimit(key2, 1, 60000).allowed).toBe(true);
    });

    it('should include resetAt timestamp', () => {
      const key = 'test-resetAt-' + Date.now();
      const before = Date.now();
      const result = rateLimit(key, 5, 60000);
      expect(result.resetAt).toBeGreaterThanOrEqual(before + 60000);
    });
  });

  describe('getClientIp', () => {
    it('should extract first IP from x-forwarded-for', () => {
      const request = {
        headers: { get: (h) => h === 'x-forwarded-for' ? '192.168.1.1, 10.0.0.1' : null },
      };
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should fall back to x-real-ip', () => {
      const request = {
        headers: { get: (h) => h === 'x-real-ip' ? '10.0.0.5' : null },
      };
      expect(getClientIp(request)).toBe('10.0.0.5');
    });

    it('should return "unknown" when no IP headers', () => {
      const request = {
        headers: { get: () => null },
      };
      expect(getClientIp(request)).toBe('unknown');
    });
  });
});
