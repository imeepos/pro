import { validateEmail, validateUsername } from './validation.js';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('应该接受有效的邮箱地址', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('应该拒绝无效的邮箱地址', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('应该接受有效的用户名', () => {
      expect(validateUsername('user')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('user_name')).toBe(true);
      expect(validateUsername('user-name')).toBe(true);
      expect(validateUsername('User123')).toBe(true);
    });

    it('应该拒绝过短的用户名', () => {
      expect(validateUsername('')).toBe(false);
      expect(validateUsername('ab')).toBe(false);
    });

    it('应该拒绝过长的用户名', () => {
      expect(validateUsername('a'.repeat(21))).toBe(false);
    });

    it('应该拒绝包含特殊字符的用户名', () => {
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('user name')).toBe(false);
      expect(validateUsername('user#name')).toBe(false);
      expect(validateUsername('user.name')).toBe(false);
    });
  });
});
