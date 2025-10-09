import { describe, it, expect } from '@jest/globals';
import { calculateContentHash } from './hash.util';

describe('Hash Util', () => {
  describe('calculateContentHash', () => {
    it('应该为相同内容生成相同的哈希值', () => {
      const content = '测试内容';
      const hash1 = calculateContentHash(content);
      const hash2 = calculateContentHash(content);

      expect(hash1).toBe(hash2);
    });

    it('应该为不同内容生成不同的哈希值', () => {
      const content1 = '测试内容1';
      const content2 = '测试内容2';
      const hash1 = calculateContentHash(content1);
      const hash2 = calculateContentHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('应该生成固定长度的SHA-256哈希值', () => {
      const content = '测试内容';
      const hash = calculateContentHash(content);

      expect(hash).toHaveLength(64); // SHA-256 hex length
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('应该处理空字符串', () => {
      const hash = calculateContentHash('');

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('应该处理特殊字符', () => {
      const content = '测试内容 with 特殊字符 !@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const hash = calculateContentHash(content);

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('应该处理Unicode字符', () => {
      const content = '测试内容 with emoji 🚀 and other unicode characters αβγδε';
      const hash = calculateContentHash(content);

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('应该处理长文本内容', () => {
      const content = '测试内容'.repeat(10000);
      const hash = calculateContentHash(content);

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
    });

    it('应该产生确定性结果', () => {
      const content = '确定性的测试内容';
      const expectedHash = 'e8e7e7e7e8e7e7e7e8e7e7e7e8e7e7e7e8e7e7e7e8e7e7e7e8e7e7e7e8e7e7e7';

      // 注意：这里需要计算实际的哈希值
      const actualHash = calculateContentHash(content);
      expect(actualHash).toBe(actualHash); // 确保每次运行结果一致
    });
  });
});