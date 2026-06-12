import { validateRegistrationNo, normalizeRegNo, REG_NO_PATTERN } from '@/lib/validation';

describe('Validation Library', () => {
  describe('REG_NO_PATTERN', () => {
    it('should be a regex', () => {
      expect(REG_NO_PATTERN).toBeInstanceOf(RegExp);
    });
  });

  describe('validateRegistrationNo', () => {
    it('should accept valid registration numbers', () => {
      expect(validateRegistrationNo('EG/2020/1234')).toBe(true);
      expect(validateRegistrationNo('eg/2021/5678')).toBe(true);
      expect(validateRegistrationNo('Eg/2025/0001')).toBe(true);
    });

    it('should reject invalid registration numbers', () => {
      expect(validateRegistrationNo('')).toBe(false);
      expect(validateRegistrationNo('EG/202/1234')).toBe(false);
      expect(validateRegistrationNo('EG/2020/123')).toBe(false);
      expect(validateRegistrationNo('EG/2020/12345')).toBe(false);
      expect(validateRegistrationNo('XX/2020/1234')).toBe(false);
      expect(validateRegistrationNo('EG2020/1234')).toBe(false);
      expect(validateRegistrationNo('EG/20201234')).toBe(false);
      expect(validateRegistrationNo('random-string')).toBe(false);
    });
  });

  describe('normalizeRegNo', () => {
    it('should convert to uppercase', () => {
      expect(normalizeRegNo('eg/2020/1234')).toBe('EG/2020/1234');
      expect(normalizeRegNo('Eg/2021/5678')).toBe('EG/2021/5678');
    });

    it('should keep already uppercase unchanged', () => {
      expect(normalizeRegNo('EG/2020/1234')).toBe('EG/2020/1234');
    });
  });
});
