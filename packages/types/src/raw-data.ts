/**
 * 原始数据处理状态
 *
 * 表达数据在处理流程中的生命周期状态
 */
export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * 数据源类型 - 细粒度存储层
 *
 * 描述原始数据的具体来源格式
 * 用于 MongoDB 存储和爬虫数据分类
 */
export enum SourceType {
  WEIBO_HTML = 'WEIBO_HTML',
  WEIBO_API_JSON = 'WEIBO_API_JSON',
  WEIBO_COMMENT = 'WEIBO_COMMENT',
  JD = 'JD',
  CUSTOM = 'CUSTOM',
}

/**
 * 数据源平台 - 粗粒度查询层
 *
 * 表达数据所属的业务平台
 * 用于 API 查询过滤和业务逻辑分组
 */
export enum SourcePlatform {
  WEIBO = 'WEIBO',
  JD = 'JD',
  CUSTOM = 'CUSTOM',
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
