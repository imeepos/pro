/**
 * 数据源类型
 */
export enum SourceType {
  WEIBO_HTML = 'weibo_html',
  WEIBO_API_JSON = 'weibo_api_json',
  WEIBO_COMMENT = 'weibo_comment',
}

/**
 * 处理状态
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 创建原始数据参数
 */
export interface CreateRawDataSourceDto {
  sourceType: SourceType | string;
  sourceUrl: string;
  rawContent: string;
  metadata?: Record<string, any>;
}

