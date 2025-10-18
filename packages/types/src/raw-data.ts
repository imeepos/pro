/**
 * 原始数据处理状态
 *
 * 表达数据在处理流程中的生命周期状态
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 数据源类型 - 细粒度存储层
 *
 * 描述原始数据的具体来源格式
 * 用于 MongoDB 存储和爬虫数据分类
 */
export enum SourceType {
  WEIBO_HTML = 'weibo_html',
  WEIBO_API_JSON = 'weibo_api_json',
  WEIBO_COMMENT = 'weibo_comment',
  JD = 'jd',
  CUSTOM = 'custom',
}

/**
 * 数据源平台 - 粗粒度查询层
 *
 * 表达数据所属的业务平台
 * 用于 API 查询过滤和业务逻辑分组
 */
export enum SourcePlatform {
  WEIBO = 'weibo',
  JD = 'jd',
  CUSTOM = 'custom',
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
