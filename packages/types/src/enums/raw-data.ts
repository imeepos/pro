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
  WEIBO_KEYWORD_SEARCH = 'weibo_keyword_search',
  WEIBO_NOTE_DETAIL = 'weibo_note_detail',
  WEIBO_CREATOR_PROFILE = 'weibo_creator_profile',
  WEIBO_COMMENTS = 'weibo_comments',
  JD = 'jd',
  CUSTOM = 'custom',
}

export enum SourcePlatform {
  WEIBO = 'weibo',
  JD = 'jd',
  CUSTOM = 'custom',
}
