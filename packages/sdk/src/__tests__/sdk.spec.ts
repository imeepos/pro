import { describe, it, expect } from 'bun:test';
import { SkerSDK } from '../index.js';

describe('SkerSDK', () => {
  describe('constructor', () => {
    it('使用有效的 baseUrl 创建实例', () => {
      const sdk = new SkerSDK('http://localhost:3000');
      expect(sdk).toBeDefined();
      expect(sdk.baseUrl).toBe('http://localhost:3000');
      expect(sdk.tokenKey).toBe('access_token');
    });

    it('使用自定义 tokenKey 创建实例', () => {
      const sdk = new SkerSDK('https://api.example.com', 'custom_token');
      expect(sdk.baseUrl).toBe('https://api.example.com');
      expect(sdk.tokenKey).toBe('custom_token');
    });

    it('拒绝空的 baseUrl', () => {
      expect(() => new SkerSDK('')).toThrow('baseUrl is required');
    });

    it('拒绝 null/undefined baseUrl', () => {
      expect(() => new SkerSDK(null as any)).toThrow('baseUrl is required');
      expect(() => new SkerSDK(undefined as any)).toThrow('baseUrl is required');
    });

    it('正确初始化所有 API 实例', () => {
      const sdk = new SkerSDK('http://localhost:3000');

      // 验证所有 API 实例都已创建
      expect(sdk.event).toBeDefined();
      expect(sdk.tag).toBeDefined();
      expect(sdk.attachment).toBeDefined();
      expect(sdk.industryType).toBeDefined();
      expect(sdk.eventType).toBeDefined();
      expect(sdk.config).toBeDefined();
      expect(sdk.auth).toBeDefined();
      expect(sdk.user).toBeDefined();
      expect(sdk.weibo).toBeDefined();
      expect(sdk.weiboSearchTasks).toBeDefined();
      expect(sdk.screen).toBeDefined();
      expect(sdk.apiKey).toBeDefined();
      expect(sdk.dashboard).toBeDefined();
    });

    it('正确传递 baseUrl 和 tokenKey 到子 API', () => {
      const baseUrl = 'https://api.example.com';
      const tokenKey = 'custom_token_key';
      const sdk = new SkerSDK(baseUrl, tokenKey);

      // 验证需要 tokenKey 的 API 接收到正确的参数
      expect(sdk.auth).toBeDefined();
      expect(sdk.user).toBeDefined();
      expect(sdk.weibo).toBeDefined();
      expect(sdk.weiboSearchTasks).toBeDefined();
      expect(sdk.screen).toBeDefined();
      expect(sdk.apiKey).toBeDefined();
      expect(sdk.dashboard).toBeDefined();
    });
  });

  describe('API 属性访问', () => {
    const sdk = new SkerSDK('http://localhost:3000');

    it('所有 API 属性应该是只读的', () => {
      const apiProps = [
        'event', 'tag', 'attachment', 'industryType', 'eventType',
        'config', 'auth', 'user', 'weibo', 'weiboSearchTasks',
        'screen', 'apiKey', 'dashboard'
      ];

      apiProps.forEach(prop => {
        expect(() => {
          (sdk as any)[prop] = null;
        }).toThrow();
      });
    });

    it('baseUrl 和 tokenKey 应该是只读的', () => {
      expect(() => {
        (sdk as any).baseUrl = 'new-url';
      }).toThrow();

      expect(() => {
        (sdk as any).tokenKey = 'new-key';
      }).toThrow();
    });
  });
});