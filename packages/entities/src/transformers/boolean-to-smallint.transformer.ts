import type { ValueTransformer } from 'typeorm';

/**
 * 将布尔值或数字转换为 smallint (0 或 1)
 * 用于处理 API 返回的布尔值与数据库 smallint 类型的映射
 */
export const booleanToSmallintTransformer: ValueTransformer = {
  to(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return value ? 1 : 0;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return 1;
      if (lower === 'false' || lower === '0') return 0;
    }
    return null;
  },

  from(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    return Number(value);
  }
};
