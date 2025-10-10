export * from './http-client.interface';
export * from './auth.interface';
export * from './user.interface';
export * from './config.interface';
export * from './weibo.interface';
export * from './weibo-auth.sdk';
export * from './jd.interface';
export * from './jd-auth.sdk';
export * from './media-type.interface';
export * from './media-type.sdk';

export * from '@pro/types';

// 事件管理系统类型导出
export * from './types/common.types';
export * from './types/event.types';
export * from './types/tag.types';
export * from './types/attachment.types';
export * from './types/industry-type.types';
export * from './types/event-type.types';
export * from './types/config.types';
export * from './types/screen.types';
export * from './types/weibo-search-tasks.types';
export * from './types/weibo.types';

// HTTP 客户端导出
export { HttpClient } from './client/http-client';

// 事件管理系统 API 导出
import { EventApi } from './api/event-api';
import { TagApi } from './api/tag-api';
import { AttachmentApi } from './api/attachment-api';
import { IndustryTypeApi } from './api/industry-type-api';
import { EventTypeApi } from './api/event-type-api';
import { ConfigApi } from './api/config-api';
import { AuthApi } from './api/auth-api';
import { UserApi } from './api/user-api';
import { WeiboSearchTasksApi } from './api/weibo-search-tasks-api';
import { ScreenApi } from './api/screen-api';
import { WeiboApi } from './api/weibo-api';
import { ApiKeyApi } from './api/api-key-api';

export { EventApi } from './api/event-api';
export { TagApi } from './api/tag-api';
export { AttachmentApi } from './api/attachment-api';
export { IndustryTypeApi } from './api/industry-type-api';
export { EventTypeApi } from './api/event-type-api';
export { ConfigApi } from './api/config-api';
export { AuthApi } from './api/auth-api';
export { UserApi } from './api/user-api';
export { WeiboSearchTasksApi } from './api/weibo-search-tasks-api';
export { ScreenApi } from './api/screen-api';
export { WeiboApi } from './api/weibo-api';
export { ApiKeyApi } from './api/api-key-api';

/**
 * SDK 主类
 */
export class SkerSDK {
  public event: EventApi;
  public tag: TagApi;
  public attachment: AttachmentApi;
  public industryType: IndustryTypeApi;
  public eventType: EventTypeApi;
  public config: ConfigApi;
  public auth: AuthApi;
  public user: UserApi;
  public weibo: WeiboApi;
  public weiboSearchTasks: WeiboSearchTasksApi;
  public screen: ScreenApi;
  public apiKey: ApiKeyApi;

  constructor(baseUrl: string) {
    this.event = new EventApi(baseUrl);
    this.tag = new TagApi(baseUrl);
    this.attachment = new AttachmentApi(baseUrl);
    this.industryType = new IndustryTypeApi(baseUrl);
    this.eventType = new EventTypeApi(baseUrl);
    this.config = new ConfigApi(baseUrl);
    this.auth = new AuthApi(baseUrl);
    this.user = new UserApi(baseUrl);
    this.weibo = new WeiboApi();
    this.weiboSearchTasks = new WeiboSearchTasksApi(baseUrl);
    this.screen = new ScreenApi();
    this.apiKey = new ApiKeyApi(baseUrl);
  }
}
