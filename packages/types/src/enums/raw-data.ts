export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SourceType {
  WEIBO_HTML = 'weibo_html',
  WEIBO_API_JSON = 'weibo_api_json',
  WEIBO_COMMENT = 'weibo_comment',
  JD = 'jd',
  CUSTOM = 'custom',
}

export enum SourcePlatform {
  WEIBO = 'weibo',
  JD = 'jd',
  CUSTOM = 'custom',
}
