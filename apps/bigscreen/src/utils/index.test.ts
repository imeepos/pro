import { formatNumber, cn } from './index';

describe('Utility Functions', () => {
  describe('formatNumber', () => {
    it('formats numbers with K notation for thousands', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1234)).toBe('1.2K');
    });

    it('formats numbers with M notation for millions', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(1234567)).toBe('1.2M');
    });

    it('handles zero and small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(999)).toBe('999');
    });

    it('handles null and undefined', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });
  });

  describe('cn (className utility)', () => {
    it('merges class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('handles conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toContain('base');
      expect(result).toContain('conditional');
      expect(result).not.toContain('hidden');
    });

    it('handles undefined and null', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toContain('base');
      expect(result).toContain('valid');
    });
  });
});