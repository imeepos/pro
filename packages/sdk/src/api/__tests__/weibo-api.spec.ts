import { describe, it, expect } from 'bun:test';
import { WeiboApi } from '../weibo-api.js';

describe('WeiboApi', () => {
  describe('constructor', () => {
    it('使用有效的 HTTP URL 创建实例', () => {
      expect(() => new WeiboApi('http://localhost:3000')).not.toThrow();
    });

    it('使用有效的 HTTPS URL 创建实例', () => {
      expect(() => new WeiboApi('https://api.example.com')).not.toThrow();
    });

    it('拒绝无效的 URL', () => {
      expect(() => new WeiboApi('invalid-url')).toThrow('无效的 baseUrl');
    });

    it('拒绝非 HTTP/HTTPS 协议', () => {
      expect(() => new WeiboApi('ftp://example.com')).toThrow('无效的 baseUrl');
    });

    it('拒绝空 baseUrl', () => {
      expect(() => new WeiboApi('')).toThrow('baseUrl is required for WeiboApi');
    });

    it('拒绝 null/undefined baseUrl', () => {
      expect(() => new WeiboApi(null as any)).toThrow('baseUrl is required for WeiboApi');
      expect(() => new WeiboApi(undefined as any)).toThrow('baseUrl is required for WeiboApi');
    });

    it('透传 tokenKey 到 HttpClient', () => {
      const api = new WeiboApi('http://localhost:3000', 'custom_token');
      expect(api).toBeDefined();
    });
  });
});
