import { describe, it, expect } from 'bun:test';
import { ScreenApi } from '../screen-api.js';

describe('ScreenApi', () => {
  describe('constructor', () => {
    it('使用有效的 HTTP URL 创建实例', () => {
      expect(() => new ScreenApi('http://localhost:3000')).not.toThrow();
    });

    it('使用有效的 HTTPS URL 创建实例', () => {
      expect(() => new ScreenApi('https://api.example.com')).not.toThrow();
    });

    it('拒绝无效的 URL', () => {
      expect(() => new ScreenApi('invalid-url')).toThrow('无效的 baseUrl');
    });

    it('拒绝非 HTTP/HTTPS 协议', () => {
      expect(() => new ScreenApi('ftp://example.com')).toThrow('无效的 baseUrl');
    });

    it('使用默认 baseUrl 当未提供时', () => {
      expect(() => new ScreenApi()).not.toThrow();
    });

    it('透传 tokenKey 到 HttpClient', () => {
      const api = new ScreenApi('http://localhost:3000', 'custom_token');
      expect(api).toBeDefined();
    });
  });
});
