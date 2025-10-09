import { createHash } from 'crypto';

/**
 * 计算内容的 SHA-256 哈希值
 */
export function calculateContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
