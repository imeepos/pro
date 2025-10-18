import { SourceType } from './enums/raw-data.js';

export * from './enums/raw-data.js';

/**
 * 创建原始数据参数
 */
export interface CreateRawDataSourceDto {
  sourceType: SourceType | string;
  sourceUrl: string;
  rawContent: string;
  metadata?: Record<string, any>;
}
