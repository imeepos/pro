export * from './http-client.interface.js';
export * from './auth.interface.js';
export * from './user.interface.js';
export * from './config.interface.js';
export * from './jd.interface.js';
export * from './jd-auth.sdk.js';
export * from './media-type.interface.js';
export * from './media-type.sdk.js';

export * from '@pro/types';

export {
  type WeiboLoginEventType,
  type WeiboLoginEvent,
  type QrcodeEventData,
  type SuccessEventData,
  type WeiboLoginEventHandler,
  type WeiboAuthSDK,
} from './weibo.interface.js';
export * from './weibo-auth.sdk.js';

// 事件管理系统类型导出
export * from './types/common.types.js';
export * from './types/event.types.js';
export * from './types/tag.types.js';
export * from './types/attachment.types.js';
export * from './types/industry-type.types.js';
export * from './types/event-type.types.js';
export * from './types/config.types.js';
export * from './types/screen.types.js';
export * from './types/weibo-search-tasks.types.js';
export * from './types/weibo.types.js';
export * from './types/dashboard.types.js';
export * from './types/bug.types.js';

// HTTP 客户端导出
export { HttpClient } from './client/http-client.js';

// 事件管理系统 API 导出
import { EventApi } from './api/event-api.js';
import { TagApi } from './api/tag-api.js';
import { AttachmentApi } from './api/attachment-api.js';
import { IndustryTypeApi } from './api/industry-type-api.js';
import { EventTypeApi } from './api/event-type-api.js';
import { ConfigApi } from './api/config-api.js';
import { AuthApi } from './api/auth-api.js';
import { UserApi } from './api/user-api.js';
import { WeiboSearchTasksApi } from './api/weibo-search-tasks-api.js';
import { ScreenApi } from './api/screen-api.js';
import { WeiboApi } from './api/weibo-api.js';
import { ApiKeyApi } from './api/api-key-api.js';
import { DashboardApi } from './api/dashboard-api.js';
import { BugApi } from './api/bug-api.js';

export { EventApi } from './api/event-api.js';
export { TagApi } from './api/tag-api.js';
export { AttachmentApi } from './api/attachment-api.js';
export { IndustryTypeApi } from './api/industry-type-api.js';
export { EventTypeApi } from './api/event-type-api.js';
export { ConfigApi } from './api/config-api.js';
export { AuthApi } from './api/auth-api.js';
export { UserApi } from './api/user-api.js';
export { WeiboSearchTasksApi } from './api/weibo-search-tasks-api.js';
export { ScreenApi } from './api/screen-api.js';
export { WeiboApi } from './api/weibo-api.js';
export { ApiKeyApi } from './api/api-key-api.js';
export { DashboardApi } from './api/dashboard-api.js';
export { BugApi } from './api/bug-api.js';

/**
 * SDK 主类
 */
export class SkerSDK {
  public readonly baseUrl: string;
  public readonly tokenKey: string;

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
  public dashboard: DashboardApi;
  public bug: BugApi;

  constructor(baseUrl: string, tokenKey: string = 'access_token') {
    if (!baseUrl) {
      throw new Error('baseUrl is required');
    }

    this.baseUrl = baseUrl;
    this.tokenKey = tokenKey;

    this.event = new EventApi(baseUrl);
    this.tag = new TagApi(baseUrl);
    this.attachment = new AttachmentApi(baseUrl);
    this.industryType = new IndustryTypeApi(baseUrl);
    this.eventType = new EventTypeApi(baseUrl);
    this.config = new ConfigApi(baseUrl);
    this.auth = new AuthApi(baseUrl, tokenKey);
    this.user = new UserApi(baseUrl, tokenKey);
    this.weibo = new WeiboApi(baseUrl, tokenKey);
    this.weiboSearchTasks = new WeiboSearchTasksApi(baseUrl, tokenKey);
    this.screen = new ScreenApi(baseUrl, tokenKey);
    this.apiKey = new ApiKeyApi(baseUrl, tokenKey);
    this.dashboard = new DashboardApi(baseUrl, tokenKey);
    this.bug = new BugApi(baseUrl, tokenKey);
  }
}
