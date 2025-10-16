# @pro/sdk - API SDK 接口文档

## 概述

`@pro/sdk` 是 Pro 平台的 TypeScript SDK，提供类型安全的 API 接口定义和客户端实现。它统一封装了平台所有服务的 API 调用，支持 GraphQL 和 REST 接口，并提供完整的 TypeScript 类型定义。

**核心价值**：
- 类型安全的 API 调用
- 统一的认证机制（JWT / API Key / 自动模式）
- GraphQL 和 REST 双协议支持
- RxJS Observable 和 Promise 双模式
- 完整的类型定义和 DTO

## 目录结构

```
src/
├── api/                    # API 实现类（14个服务）
│   ├── auth-api.ts        # 认证服务
│   ├── user-api.ts        # 用户管理
│   ├── event-api.ts       # 事件管理
│   ├── tag-api.ts         # 标签管理
│   ├── attachment-api.ts  # 附件管理
│   ├── event-type-api.ts  # 事件类型
│   ├── industry-type-api.ts # 行业类型
│   ├── config-api.ts      # 配置管理
│   ├── screen-api.ts      # 大屏管理
│   ├── weibo-api.ts       # 微博账号管理
│   ├── weibo-search-tasks-api.ts # 微博搜索任务
│   ├── api-key-api.ts     # API密钥管理
│   ├── dashboard-api.ts   # 仪表盘统计
│   └── bug-api.ts         # Bug管理
├── client/                 # 底层客户端实现
│   ├── http-client.ts     # HTTP 客户端（REST）
│   └── graphql-client.ts  # GraphQL 客户端
├── types/                  # 类型定义（13个模块）
│   ├── common.types.ts    # 通用类型（分页等）
│   ├── event.types.ts     # 事件相关类型
│   ├── tag.types.ts       # 标签类型
│   ├── attachment.types.ts # 附件类型
│   ├── event-type.types.ts # 事件类型
│   ├── industry-type.types.ts # 行业类型
│   ├── config.types.ts    # 配置类型
│   ├── screen.types.ts    # 大屏类型
│   ├── weibo.types.ts     # 微博类型
│   ├── weibo-search-tasks.types.ts # 微博任务类型
│   ├── dashboard.types.ts # 仪表盘类型
│   ├── bug.types.ts       # Bug类型
│   └── auth-config.ts     # 认证配置
├── utils/                  # 工具函数
│   └── observable-adapter.ts # Observable适配器
├── websocket/              # WebSocket 支持（预留）
├── *.interface.ts          # 接口定义
│   ├── auth.interface.ts  # 认证接口
│   ├── user.interface.ts  # 用户接口
│   ├── config.interface.ts # 配置接口
│   ├── weibo.interface.ts # 微博接口
│   ├── jd.interface.ts    # 京东接口
│   ├── media-type.interface.ts # 媒体类型接口
│   └── http-client.interface.ts # HTTP客户端接口
├── weibo-auth.sdk.ts       # 微博认证 SDK 实现
├── media-type.sdk.ts       # 媒体类型 SDK 实现
├── jd-auth.sdk.ts          # 京东认证 SDK 实现
└── index.ts                # 主入口和 SDK 类
```

## 核心架构

### 1. SDK 主类 (SkerSDK)

位置: `/home/ubuntu/worktrees/pro/packages/sdk/src/index.ts`

SDK 主类是所有 API 的统一入口点：

```typescript
const sdk = new SkerSDK('http://api.example.com', 'access_token');

// 访问各个服务 API
sdk.auth.login({...});
sdk.event.getEvents({...});
sdk.weibo.getAccounts();
// ... 等等
```

**包含的服务**：
- `auth`: 认证服务
- `user`: 用户管理
- `event`: 事件管理
- `tag`: 标签管理
- `attachment`: 附件管理
- `eventType`: 事件类型
- `industryType`: 行业类型
- `config`: 配置管理
- `screen`: 大屏管理
- `weibo`: 微博账号管理
- `weiboSearchTasks`: 微博搜索任务
- `apiKey`: API密钥管理
- `dashboard`: 仪表盘统计
- `bug`: Bug管理

### 2. 客户端实现

#### GraphQLClient

位置: `/home/ubuntu/worktrees/pro/packages/sdk/src/client/graphql-client.ts`

**特性**：
- 支持三种认证模式：JWT、API Key、自动模式
- 统一的错误处理
- localStorage 自动获取 token

**认证模式**：
```typescript
// JWT 模式（默认）
const client = GraphQLClient.withJwt(baseUrl, 'access_token');

// API Key 模式
const client = GraphQLClient.withApiKey(baseUrl, 'api_key');

// 自动模式（优先 JWT，回退到 API Key）
const client = GraphQLClient.withAutoAuth(baseUrl);

// 自定义配置
const client = GraphQLClient.withConfig(baseUrl, {
  tokenKey: 'custom_token',
  mode: AuthMode.JWT
});
```

#### HttpClient

位置: `/home/ubuntu/worktrees/pro/packages/sdk/src/client/http-client.ts`

**特性**：
- RESTful API 支持
- 自动 token 注入
- 文件上传支持（带进度回调）
- 统一的响应解包

**方法**：
- `get<T>(url, params)`: GET 请求
- `post<T>(url, data)`: POST 请求
- `put<T>(url, data)`: PUT 请求
- `delete<T>(url, params)`: DELETE 请求
- `patch<T>(url, data)`: PATCH 请求
- `upload<T>(url, formData, onProgress)`: 文件上传

### 3. API 模式分类

#### 模式 A: Promise-based (大多数 API)
```typescript
// 示例：EventApi
async getEvents(params: EventQueryParams): Promise<PageResponse<Event>>
async getEventById(id: string): Promise<EventDetail>
async createEvent(dto: CreateEventDto): Promise<Event>
```

#### 模式 B: Observable-based (认证相关)
```typescript
// 示例：AuthApi
login(dto: LoginDto): Observable<AuthResponse>
register(dto: RegisterDto): Observable<AuthResponse>
getProfile(): Observable<User>
```

#### 模式 C: 混合模式 (提供两种调用方式)
```typescript
// 示例：DashboardApi
async getStats(): Promise<DashboardStats>
getStats$(): Observable<DashboardStats>  // RxJS 版本
```

## API 接口清单

### 1. 认证服务 (AuthApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/auth-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/auth.interface.ts`
**协议**: GraphQL
**返回**: Observable

**方法**：
- `login(dto: LoginDto): Observable<AuthResponse>` - 用户登录
- `register(dto: RegisterDto): Observable<AuthResponse>` - 用户注册
- `logout(): Observable<void>` - 登出
- `refreshToken(refreshToken: string): Observable<AuthResponse>` - 刷新令牌
- `getProfile(): Observable<User>` - 获取当前用户信息

### 2. 用户管理 (UserApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/user-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/user.interface.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getUsers(params: PageRequest): Promise<PageResponse<User>>` - 获取用户列表
- `getUserById(id: string): Promise<User>` - 获取用户详情
- `updateUser(id: string, dto: UpdateUserDto): Promise<User>` - 更新用户
- `deleteUser(id: string): Promise<void>` - 删除用户

### 3. 事件管理 (EventApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/event-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/event.types.ts`
**协议**: GraphQL
**返回**: Promise

**核心类型**：
```typescript
enum EventStatus {
  DRAFT = 0,      // 草稿
  PUBLISHED = 1,  // 已发布
  ARCHIVED = 2    // 已归档
}

interface Event {
  id: string;
  eventTypeId: string;
  industryTypeId: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  locationText?: string;
  longitude?: number;
  latitude?: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

interface EventDetail extends Event {
  eventType?: EventType;
  industryType?: IndustryType;
  tags?: Tag[];
  attachments?: Attachment[];
}
```

**方法**：
- `getEvents(params: EventQueryParams): Promise<PageResponse<Event>>` - 分页查询事件
- `getEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]>` - 获取地图数据
- `getEventById(id: string): Promise<EventDetail>` - 获取事件详情（含关联数据）
- `createEvent(dto: CreateEventDto): Promise<Event>` - 创建事件
- `updateEvent(id: string, dto: UpdateEventDto): Promise<Event>` - 更新事件
- `deleteEvent(id: string): Promise<void>` - 删除事件
- `publishEvent(id: string): Promise<Event>` - 发布事件
- `archiveEvent(id: string): Promise<Event>` - 归档事件
- `getNearbyEvents(lng: number, lat: number, radius: number): Promise<Event[]>` - 获取附近事件
- `getEventsByTag(tagId: string): Promise<Event[]>` - 按标签查询事件
- `addTagsToEvent(eventId: string, tagIds: string[]): Promise<void>` - 添加标签
- `removeTagFromEvent(eventId: string, tagId: string): Promise<void>` - 移除标签

### 4. 标签管理 (TagApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/tag-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/tag.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getTags(params?: TagQueryParams): Promise<PageResponse<Tag>>` - 获取标签列表
- `getTagById(id: string): Promise<Tag>` - 获取标签详情
- `createTag(dto: CreateTagDto): Promise<Tag>` - 创建标签
- `updateTag(id: string, dto: UpdateTagDto): Promise<Tag>` - 更新标签
- `deleteTag(id: string): Promise<void>` - 删除标签

### 5. 附件管理 (AttachmentApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/attachment-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/attachment.types.ts`
**协议**: GraphQL + REST (上传)
**返回**: Promise

**方法**：
- `getAttachments(eventId: string): Promise<Attachment[]>` - 获取附件列表
- `uploadAttachment(eventId: string, file: File, onProgress?: (p: number) => void): Promise<Attachment>` - 上传附件
- `deleteAttachment(id: string): Promise<void>` - 删除附件
- `updateAttachmentOrder(eventId: string, attachmentIds: string[]): Promise<void>` - 更新排序

### 6. 事件类型 (EventTypeApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/event-type-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/event-type.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getEventTypes(params?: PageRequest): Promise<PageResponse<EventType>>` - 获取事件类型列表
- `getEventTypeById(id: string): Promise<EventType>` - 获取详情
- `createEventType(dto: CreateEventTypeDto): Promise<EventType>` - 创建
- `updateEventType(id: string, dto: UpdateEventTypeDto): Promise<EventType>` - 更新
- `deleteEventType(id: string): Promise<void>` - 删除

### 7. 行业类型 (IndustryTypeApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/industry-type-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/industry-type.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getIndustryTypes(params?: PageRequest): Promise<PageResponse<IndustryType>>` - 获取行业类型列表
- `getIndustryTypeById(id: string): Promise<IndustryType>` - 获取详情
- `createIndustryType(dto: CreateIndustryTypeDto): Promise<IndustryType>` - 创建
- `updateIndustryType(id: string, dto: UpdateIndustryTypeDto): Promise<IndustryType>` - 更新
- `deleteIndustryType(id: string): Promise<void>` - 删除

### 8. 配置管理 (ConfigApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/config-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/config.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getConfig(key: string): Promise<Config>` - 获取配置项
- `getAllConfigs(): Promise<Config[]>` - 获取所有配置
- `updateConfig(key: string, value: string): Promise<Config>` - 更新配置

### 9. 大屏管理 (ScreenApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/screen-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/screen.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getScreens(params?: PageRequest): Promise<PageResponse<Screen>>` - 获取大屏列表
- `getScreenById(id: string): Promise<Screen>` - 获取详情
- `createScreen(dto: CreateScreenDto): Promise<Screen>` - 创建大屏
- `updateScreen(id: string, dto: UpdateScreenDto): Promise<Screen>` - 更新
- `deleteScreen(id: string): Promise<void>` - 删除

### 10. 微博账号管理 (WeiboApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/weibo-api.ts`
**类型**: `@pro/types` (WeiboAccount 等)
**协议**: GraphQL
**返回**: Observable

**核心类型**：
```typescript
enum WeiboAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

interface WeiboAccount {
  id: number;
  userId: number;
  username: string;
  nickname: string;
  uid: string;
  status: WeiboAccountStatus;
  cookies?: string;
  isHealthy: boolean;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastCheckAt?: Date;
}

interface WeiboAccountStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  expired: number;
  healthy: number;
  unhealthy: number;
}
```

**方法**：
- `getAccounts(filters?: WeiboAccountFilters): Observable<WeiboAccountListResponse>` - 获取账号列表
- `getAccount(id: number): Observable<WeiboAccount>` - 获取账号详情
- `removeAccount(id: number): Observable<void>` - 删除账号
- `checkAccount(id: number): Observable<void>` - 检查账号健康状态
- `checkAllAccounts(): Observable<void>` - 批量检查所有账号
- `getAccountStats(): Observable<WeiboAccountStats>` - 获取统计信息
- `startLogin(): Observable<WeiboLoginSession>` - 开始登录流程
- `getLoginSession(sessionId: string): Observable<WeiboLoginSession>` - 获取登录会话

### 11. 微博搜索任务 (WeiboSearchTasksApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/weibo-search-tasks-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/weibo-search-tasks.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getTasks(params?: PageRequest): Promise<PageResponse<WeiboSearchTask>>` - 获取任务列表
- `getTaskById(id: string): Promise<WeiboSearchTask>` - 获取任务详情
- `createTask(dto: CreateWeiboSearchTaskDto): Promise<WeiboSearchTask>` - 创建任务
- `updateTask(id: string, dto: UpdateWeiboSearchTaskDto): Promise<WeiboSearchTask>` - 更新任务
- `deleteTask(id: string): Promise<void>` - 删除任务

### 12. API密钥管理 (ApiKeyApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/api-key-api.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getApiKeys(): Promise<ApiKey[]>` - 获取密钥列表
- `createApiKey(name: string): Promise<ApiKey>` - 创建密钥
- `revokeApiKey(id: string): Promise<void>` - 撤销密钥

### 13. 仪表盘统计 (DashboardApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/dashboard-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/dashboard.types.ts`
**协议**: GraphQL
**返回**: Promise / Observable

**核心类型**：
```typescript
interface DashboardStats {
  totalScreens: number;
  totalEvents: number;
  totalWeiboAccounts: number;
  totalSearchTasks: number;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
  entityId?: string;
}
```

**方法**：
- `getStats(): Promise<DashboardStats>` - 获取统计数据
- `getStats$(): Observable<DashboardStats>` - Observable 版本
- `getRecentActivities(): Promise<RecentActivity[]>` - 获取最近活动
- `getRecentActivities$(): Observable<RecentActivity[]>` - Observable 版本

### 14. Bug管理 (BugApi)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/api/bug-api.ts`
**类型**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/bug.types.ts`
**协议**: GraphQL
**返回**: Promise

**方法**：
- `getBugs(params?: PageRequest): Promise<PageResponse<Bug>>` - 获取Bug列表
- `getBugById(id: string): Promise<Bug>` - 获取详情
- `createBug(dto: CreateBugDto): Promise<Bug>` - 创建Bug
- `updateBug(id: string, dto: UpdateBugDto): Promise<Bug>` - 更新
- `deleteBug(id: string): Promise<void>` - 删除

## 特殊 SDK

### 1. 微博认证 SDK (WeiboAuthSDK)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/weibo-auth.sdk.ts`
**接口**: `/home/ubuntu/worktrees/pro/packages/sdk/src/weibo.interface.ts`
**协议**: REST + SSE (Server-Sent Events)

**特性**：
- 基于 SSE 的实时二维码登录流程
- 支持账号健康检查
- 账号增删改查

**使用示例**：
```typescript
import { createWeiboAuthSDK } from '@pro/sdk';

const weiboSDK = createWeiboAuthSDK('http://api.example.com');

// 启动登录流程（SSE）
const eventSource = weiboSDK.startLogin(token, (event) => {
  if (event.type === 'qrcode') {
    console.log('二维码URL:', event.data.qrCodeUrl);
  } else if (event.type === 'success') {
    console.log('登录成功:', event.data.account);
  }
});

// 获取账号列表
const { accounts } = await weiboSDK.getAccounts(token);

// 检查账号健康状态
const result = await weiboSDK.checkAccount(token, accountId);

// 删除账号
await weiboSDK.deleteAccount(token, accountId);
```

### 2. 媒体类型 SDK (MediaTypeSDK)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/media-type.sdk.ts`
**接口**: `/home/ubuntu/worktrees/pro/packages/sdk/src/media-type.interface.ts`

（具体实现待补充）

### 3. 京东认证 SDK (JdAuthSDK)

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/jd-auth.sdk.ts`
**接口**: `/home/ubuntu/worktrees/pro/packages/sdk/src/jd.interface.ts`

（具体实现待补充）

## 通用类型

### 分页类型

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/common.types.ts`

```typescript
interface PageRequest {
  page: number;
  pageSize: number;
}

interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface SdkApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

### 认证配置

**文件**: `/home/ubuntu/worktrees/pro/packages/sdk/src/types/auth-config.ts`

```typescript
enum AuthMode {
  JWT = 'jwt',
  API_KEY = 'api_key',
  AUTO = 'auto',
}

interface AuthConfig {
  tokenKey: string;
  mode: AuthMode;
}
```

## 使用示例

### 基础用法

```typescript
import { SkerSDK } from '@pro/sdk';

// 初始化 SDK
const sdk = new SkerSDK('http://localhost:4200/api');

// 登录
sdk.auth.login({ username: 'admin', password: '123456' }).subscribe({
  next: (response) => {
    localStorage.setItem('access_token', response.accessToken);
    console.log('登录成功:', response.user);
  },
  error: (err) => console.error('登录失败:', err)
});

// 获取事件列表
const events = await sdk.event.getEvents({
  page: 1,
  pageSize: 20,
  status: EventStatus.PUBLISHED
});
console.log(`总共 ${events.total} 个事件`);

// 创建事件
const newEvent = await sdk.event.createEvent({
  eventName: '某市突发事件',
  eventTypeId: '1',
  industryTypeId: '1',
  occurTime: '2025-01-15T10:00:00Z',
  province: '广东省',
  city: '深圳市'
});
```

### 高级用法：认证模式切换

```typescript
import { GraphQLClient, AuthMode } from '@pro/sdk';

// 方式1: 使用 JWT（默认）
const jwtClient = GraphQLClient.withJwt('http://api.example.com', 'access_token');

// 方式2: 使用 API Key
const apiKeyClient = GraphQLClient.withApiKey('http://api.example.com', 'api_key');

// 方式3: 自动模式（优先JWT，回退到API Key）
const autoClient = GraphQLClient.withAutoAuth('http://api.example.com');

// 方式4: 自定义配置
const customClient = GraphQLClient.withConfig('http://api.example.com', {
  tokenKey: 'my_custom_token',
  mode: AuthMode.JWT
});
```

### 高级用法：文件上传

```typescript
const file = document.querySelector('input[type="file"]').files[0];

const attachment = await sdk.attachment.uploadAttachment(
  eventId,
  file,
  (progress) => {
    console.log(`上传进度: ${progress}%`);
  }
);

console.log('上传成功:', attachment.fileUrl);
```

### 高级用法：地理位置查询

```typescript
// 获取附近的事件
const nearbyEvents = await sdk.event.getNearbyEvents(
  114.0579, // 经度
  22.5431,  // 纬度
  5000      // 半径（米）
);

// 获取地图数据
const mapPoints = await sdk.event.getEventsForMap({
  province: '广东省',
  status: EventStatus.PUBLISHED,
  startTime: '2025-01-01',
  endTime: '2025-12-31'
});
```

### 高级用法：微博账号管理

```typescript
// 获取账号统计
sdk.weibo.getAccountStats().subscribe((stats) => {
  console.log(`总账号: ${stats.total}`);
  console.log(`健康: ${stats.healthy}, 异常: ${stats.unhealthy}`);
});

// 批量健康检查
sdk.weibo.checkAllAccounts().subscribe({
  next: () => console.log('检查完成'),
  error: (err) => console.error('检查失败:', err)
});

// 微博登录（使用特殊 SDK）
import { createWeiboAuthSDK } from '@pro/sdk';

const weiboSDK = createWeiboAuthSDK('http://api.example.com');
const token = localStorage.getItem('access_token');

const eventSource = weiboSDK.startLogin(token, (event) => {
  switch (event.type) {
    case 'qrcode':
      displayQRCode(event.data.qrCodeUrl);
      break;
    case 'success':
      console.log('登录成功:', event.data.account);
      eventSource.close();
      break;
    case 'error':
      console.error('登录失败:', event.data.message);
      break;
  }
});
```

## AI 快速查找指南

当需要查找特定 API 时，请使用以下策略：

### 1. 按功能模块查找

| 功能 | API 类 | 文件位置 |
|------|--------|---------|
| 认证登录 | AuthApi | `/api/auth-api.ts` |
| 用户管理 | UserApi | `/api/user-api.ts` |
| 事件管理 | EventApi | `/api/event-api.ts` |
| 标签管理 | TagApi | `/api/tag-api.ts` |
| 附件上传 | AttachmentApi | `/api/attachment-api.ts` |
| 事件类型 | EventTypeApi | `/api/event-type-api.ts` |
| 行业类型 | IndustryTypeApi | `/api/industry-type-api.ts` |
| 系统配置 | ConfigApi | `/api/config-api.ts` |
| 大屏管理 | ScreenApi | `/api/screen-api.ts` |
| 微博账号 | WeiboApi | `/api/weibo-api.ts` |
| 微博任务 | WeiboSearchTasksApi | `/api/weibo-search-tasks-api.ts` |
| API密钥 | ApiKeyApi | `/api/api-key-api.ts` |
| 仪表盘 | DashboardApi | `/api/dashboard-api.ts` |
| Bug管理 | BugApi | `/api/bug-api.ts` |

### 2. 按类型定义查找

所有 DTO 和实体类型都在 `/types/` 目录下：

| 类型 | 文件 |
|------|------|
| Event, EventDetail, EventStatus | `/types/event.types.ts` |
| Tag, TagCategory | `/types/tag.types.ts` |
| Attachment | `/types/attachment.types.ts` |
| EventType | `/types/event-type.types.ts` |
| IndustryType | `/types/industry-type.types.ts` |
| Screen | `/types/screen.types.ts` |
| WeiboSearchTask | `/types/weibo-search-tasks.types.ts` |
| DashboardStats | `/types/dashboard.types.ts` |
| Bug | `/types/bug.types.ts` |
| PageRequest, PageResponse | `/types/common.types.ts` |
| AuthConfig, AuthMode | `/types/auth-config.ts` |

### 3. 按协议类型查找

- **GraphQL API**: 所有 API 类（除 WeiboAuthSDK）
- **REST API**: HttpClient, 文件上传
- **SSE (Server-Sent Events)**: WeiboAuthSDK.startLogin

### 4. 按返回类型查找

- **Promise**: EventApi, TagApi, AttachmentApi 等（大多数）
- **Observable**: AuthApi, WeiboApi
- **混合（Promise + Observable）**: DashboardApi

### 5. 常见操作映射

| 操作 | API 方法 |
|------|---------|
| 获取列表（分页）| `getXxx(params: PageRequest)` |
| 获取详情 | `getXxxById(id: string)` |
| 创建 | `createXxx(dto: CreateXxxDto)` |
| 更新 | `updateXxx(id: string, dto: UpdateXxxDto)` |
| 删除 | `deleteXxx(id: string)` |
| 上传文件 | `AttachmentApi.uploadAttachment()` |
| 地理查询 | `EventApi.getNearbyEvents()` |
| 统计数据 | `DashboardApi.getStats()` |

## 注意事项

1. **Token 管理**：SDK 会自动从 `localStorage` 读取 token，key 默认为 `access_token`
2. **错误处理**：所有 API 错误都会抛出异常，建议使用 try-catch 或 Observable 的 error 回调
3. **类型安全**：所有 DTO 都有完整的 TypeScript 类型定义，编译时会检查类型错误
4. **GraphQL 优先**：大部分 API 使用 GraphQL，确保后端 GraphQL endpoint 可用
5. **SSE 连接**：微博登录使用 SSE，注意浏览器兼容性和连接管理
6. **文件上传**：使用 `HttpClient.upload()` 或 `AttachmentApi.uploadAttachment()`
7. **Observable vs Promise**：认证相关使用 Observable，其他大多使用 Promise

## 依赖关系

```
@pro/sdk
├── @pro/types (基础类型定义)
└── rxjs (Observable 支持)
```

## 构建和开发

```bash
# 开发模式（监听文件变化）
pnpm run dev

# 构建
pnpm run build

# 类型检查
pnpm run typecheck

# 测试
pnpm run test
```

## 版本信息

- **当前版本**: 1.0.0
- **Node 类型**: ESM (type: "module")
- **主入口**: `dist/index.js`
- **类型定义**: `dist/index.d.ts`

---

**最后更新**: 2025-10-16
**维护者**: Pro Platform Team
