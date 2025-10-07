import { decodeToken, isTokenExpired, getTokenExpiry } from './token';

describe('Token Utils', () => {
  describe('decodeToken', () => {
    it('应该成功解码有效的 JWT token', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6InRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzY2MDA0MDAsImV4cCI6MTczNjYwNDAwMH0.veryFakeSignature';

      const payload = decodeToken(validToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('123456');
      expect(payload?.username).toBe('test');
      expect(payload?.email).toBe('test@example.com');
    });

    it('应该对无效 token 返回 null', () => {
      const invalidToken = 'invalid.token.here';
      const payload = decodeToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('应该对空字符串返回 null', () => {
      const payload = decodeToken('');
      expect(payload).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('应该检测到过期的 token', () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6InRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDYwMH0.veryFakeSignature';

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('应该检测到未过期的 token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const futureToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({
          userId: '123456',
          username: 'test',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: futureTime,
        })
      )}.veryFakeSignature`;

      expect(isTokenExpired(futureToken)).toBe(false);
    });

    it('应该对无效 token 返回 true', () => {
      expect(isTokenExpired('invalid.token')).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('应该返回 token 的过期时间', () => {
      const expTime = 1736604000;
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6InRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzY2MDA0MDAsImV4cCI6MTczNjYwNDAwMH0.veryFakeSignature';

      const expiry = getTokenExpiry(token);

      expect(expiry).not.toBeNull();
      expect(expiry?.getTime()).toBe(expTime * 1000);
    });

    it('应该对无效 token 返回 null', () => {
      const expiry = getTokenExpiry('invalid.token');
      expect(expiry).toBeNull();
    });
  });
});
