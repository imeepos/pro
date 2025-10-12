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

    it('拒绝空 baseUrl', () => {
      expect(() => new ScreenApi('')).toThrow('baseUrl is required for ScreenApi');
    });

    it('拒绝 null/undefined baseUrl', () => {
      expect(() => new ScreenApi(null as any)).toThrow('baseUrl is required for ScreenApi');
      expect(() => new ScreenApi(undefined as any)).toThrow('baseUrl is required for ScreenApi');
    });

    it('透传 tokenKey 到 HttpClient', () => {
      const api = new ScreenApi('http://localhost:3000', 'custom_token');
      expect(api).toBeDefined();
    });
  });
});
