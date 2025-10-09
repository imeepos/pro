# 事件管理系统 SDK 使用文档

## 目录结构

```
packages/sdk/src/
├── types/                              # 类型定义
│   ├── common.types.ts                 # 通用类型（分页等）
│   ├── event.types.ts                  # 事件相关类型
│   ├── tag.types.ts                    # 标签类型
│   ├── attachment.types.ts             # 附件类型
│   ├── industry-type.types.ts          # 行业类型
│   └── event-type.types.ts             # 事件类型
├── api/                                # API 接口封装
│   ├── event-api.ts                    # 事件 API
│   ├── tag-api.ts                      # 标签 API
│   ├── attachment-api.ts               # 附件 API
│   ├── industry-type-api.ts            # 行业类型 API
│   └── event-type-api.ts               # 事件类型 API
├── client/                             # HTTP 客户端
│   └── http-client.ts                  # HTTP 客户端封装
└── index.ts                            # SDK 导出
```

## 安装

```bash
# SDK 已在 workspace 中，无需额外安装
# 在其他包中使用
pnpm add @pro/sdk --filter=your-package
```

## 基础使用

### 1. 初始化 SDK

```typescript
import { SkerSDK } from '@pro/sdk';

// 创建 SDK 实例
const sdk = new SkerSDK('http://localhost:3000');

// 现在可以使用各个 API
sdk.event.getEvents({ page: 1, pageSize: 10 });
sdk.tag.getTags();
sdk.attachment.uploadAttachment(eventId, file);
```

### 2. 在 Angular 服务中使用

```typescript
// apps/admin/src/app/state/events.service.ts
import { Injectable } from '@angular/core';
import {
  SkerSDK,
  Event,
  CreateEventDto,
  EventQueryParams,
  EventStatus
} from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private sdk: SkerSDK;

  constructor() {
    this.sdk = new SkerSDK(environment.apiUrl);
  }

  // 查询事件列表
  async loadEvents(params: EventQueryParams): Promise<void> {
    try {
      const response = await this.sdk.event.getEvents(params);
      // 处理响应数据
      console.log('事件列表:', response.data);
      console.log('总数:', response.total);
    } catch (error) {
      console.error('加载事件失败:', error);
    }
  }

  // 创建事件
  async createEvent(dto: CreateEventDto): Promise<Event> {
    return this.sdk.event.createEvent(dto);
  }

  // 更新事件
  async updateEvent(id: number, dto: Partial<CreateEventDto>): Promise<Event> {
    return this.sdk.event.updateEvent(id, { ...dto, id });
  }

  // 删除事件
  async deleteEvent(id: number): Promise<void> {
    await this.sdk.event.deleteEvent(id);
  }

  // 发布事件
  async publishEvent(id: number): Promise<Event> {
    return this.sdk.event.publishEvent(id);
  }

  // 归档事件
  async archiveEvent(id: number): Promise<Event> {
    return this.sdk.event.archiveEvent(id);
  }
}
```

## API 使用示例

### 事件 API (EventApi)

```typescript
import { EventQueryParams, EventStatus, CreateEventDto } from '@pro/sdk';

// 1. 查询事件列表
const params: EventQueryParams = {
  page: 1,
  pageSize: 20,
  industryTypeId: 1,
  eventTypeId: 2,
  province: '北京市',
  city: '北京市',
  status: EventStatus.PUBLISHED,
  tagIds: [1, 2, 3],
  keyword: '搜索关键词'
};

const response = await sdk.event.getEvents(params);
// response: { data: Event[], total: number, page: number, pageSize: number }

// 2. 获取事件详情
const eventDetail = await sdk.event.getEventById(1);
// eventDetail: 包含关联的 eventType, industryType, tags, attachments

// 3. 创建事件
const createDto: CreateEventDto = {
  eventTypeId: 1,
  industryTypeId: 1,
  eventName: '事件名称',
  summary: '事件简介',
  occurTime: '2025-10-08T10:00:00Z',
  province: '北京市',
  city: '北京市',
  district: '朝阳区',
  street: '建国路1号',
  locationText: '某某大厦',
  longitude: 116.407396,
  latitude: 39.904211,
  status: EventStatus.DRAFT,
  tagIds: [1, 2]
};

const newEvent = await sdk.event.createEvent(createDto);

// 4. 更新事件
const updatedEvent = await sdk.event.updateEvent(1, {
  id: 1,
  eventName: '更新后的事件名称'
});

// 5. 删除事件
await sdk.event.deleteEvent(1);

// 6. 发布事件
const publishedEvent = await sdk.event.publishEvent(1);

// 7. 归档事件
const archivedEvent = await sdk.event.archiveEvent(1);

// 8. 查询附近事件
const nearbyEvents = await sdk.event.getNearbyEvents(
  116.407396, // 经度
  39.904211,  // 纬度
  10          // 半径（公里）
);

// 9. 按标签查询事件
const eventsByTag = await sdk.event.getEventsByTag(1);

// 10. 为事件添加标签
await sdk.event.addTagsToEvent(1, [1, 2, 3]);

// 11. 移除事件标签
await sdk.event.removeTagFromEvent(1, 2);
```

### 标签 API (TagApi)

```typescript
import { CreateTagDto, UpdateTagDto } from '@pro/sdk';

// 1. 查询标签列表
const tagsResponse = await sdk.tag.getTags({
  page: 1,
  pageSize: 20,
  keyword: '搜索关键词'
});

// 2. 获取标签详情
const tag = await sdk.tag.getTagById(1);

// 3. 创建标签
const createTagDto: CreateTagDto = {
  tagName: '新标签',
  tagColor: '#1890ff'
};

const newTag = await sdk.tag.createTag(createTagDto);

// 4. 更新标签
const updateTagDto: UpdateTagDto = {
  id: 1,
  tagName: '更新标签名',
  tagColor: '#ff0000'
};

const updatedTag = await sdk.tag.updateTag(1, updateTagDto);

// 5. 删除标签
await sdk.tag.deleteTag(1);

// 6. 获取热门标签
const popularTags = await sdk.tag.getPopularTags(20); // 获取前20个热门标签
```

### 附件 API (AttachmentApi)

```typescript
// 1. 上传附件
const file: File = ...; // 从文件输入获取
const attachment = await sdk.attachment.uploadAttachment(eventId, file);

// 2. 获取事件的所有附件
const attachments = await sdk.attachment.getAttachments(eventId);

// 3. 删除附件
await sdk.attachment.deleteAttachment(eventId, attachmentId);

// 4. 批量更新附件排序
await sdk.attachment.updateAttachmentsSort(eventId, [
  { id: 1, sortOrder: 0 },
  { id: 2, sortOrder: 1 },
  { id: 3, sortOrder: 2 }
]);
```

### 行业类型 API (IndustryTypeApi)

```typescript
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from '@pro/sdk';

// 1. 查询行业类型列表
const industryTypes = await sdk.industryType.getIndustryTypes();

// 2. 获取行业类型详情
const industryType = await sdk.industryType.getIndustryTypeById(1);

// 3. 创建行业类型
const createDto: CreateIndustryTypeDto = {
  industryCode: 'IND001',
  industryName: '制造业',
  description: '制造业描述',
  sortOrder: 1,
  status: 1
};

const newIndustryType = await sdk.industryType.createIndustryType(createDto);

// 4. 更新行业类型
const updateDto: UpdateIndustryTypeDto = {
  id: 1,
  industryName: '更新后的行业名称'
};

const updatedIndustryType = await sdk.industryType.updateIndustryType(1, updateDto);

// 5. 删除行业类型
await sdk.industryType.deleteIndustryType(1);
```

### 事件类型 API (EventTypeApi)

```typescript
import { CreateEventTypeDto, UpdateEventTypeDto } from '@pro/sdk';

// 1. 查询事件类型列表
const eventTypes = await sdk.eventType.getEventTypes();

// 2. 获取事件类型详情
const eventType = await sdk.eventType.getEventTypeById(1);

// 3. 按行业查询事件类型
const eventTypesByIndustry = await sdk.eventType.getEventTypesByIndustry(1);

// 4. 创建事件类型
const createDto: CreateEventTypeDto = {
  eventCode: 'EVT001001',
  eventName: '设备故障',
  industryId: 1,
  description: '设备故障事件',
  sortOrder: 1,
  status: 1
};

const newEventType = await sdk.eventType.createEventType(createDto);

// 5. 更新事件类型
const updateDto: UpdateEventTypeDto = {
  id: 1,
  eventName: '更新后的事件类型名称'
};

const updatedEventType = await sdk.eventType.updateEventType(1, updateDto);

// 6. 删除事件类型
await sdk.eventType.deleteEventType(1);
```

## 类型定义

### 事件状态

```typescript
export enum EventStatus {
  DRAFT = 0,      // 草稿
  PUBLISHED = 1,  // 已发布
  ARCHIVED = 2    // 已归档
}
```

### 文件类型

```typescript
export enum FileType {
  IMAGE = 'image',       // 图片
  VIDEO = 'video',       // 视频
  DOCUMENT = 'document'  // 文档
}
```

### 主要接口

```typescript
// 事件实体
interface Event {
  id: number;
  eventTypeId: number;
  industryTypeId: number;
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
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// 事件详情（含关联数据）
interface EventDetail extends Event {
  eventType?: EventType;
  industryType?: IndustryType;
  tags?: Tag[];
  attachments?: Attachment[];
}

// 标签
interface Tag {
  id: number;
  tagName: string;
  tagColor: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 附件
interface Attachment {
  id: number;
  eventId: number;
  fileName: string;
  fileUrl: string;
  bucketName: string;
  objectName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  sortOrder: number;
  createdAt: string;
}
```

## 错误处理

```typescript
try {
  const event = await sdk.event.getEventById(1);
  console.log('获取成功:', event);
} catch (error) {
  console.error('获取失败:', error);
  // 处理错误
}
```

## 认证

HTTP 客户端会自动从 localStorage 中获取 `auth_token` 并添加到请求头：

```typescript
// 自动添加 Authorization header
headers['Authorization'] = `Bearer ${token}`;
```

确保在登录后将 token 存储到 localStorage：

```typescript
localStorage.setItem('auth_token', 'your-token-here');
```

## 注意事项

1. **类型安全**: 所有 API 方法都有完整的 TypeScript 类型定义
2. **统一封装**: 所有 HTTP 请求都通过 HttpClient 处理
3. **自动认证**: Token 从 localStorage 自动获取并添加到请求头
4. **FormData 支持**: 附件上传自动处理 FormData
5. **错误处理**: 使用标准的 try/catch 处理异步错误

## 完整示例：创建事件流程

```typescript
import { SkerSDK, CreateEventDto, EventStatus } from '@pro/sdk';

async function createEventWithAttachments() {
  const sdk = new SkerSDK('http://localhost:3000');

  try {
    // 1. 创建事件
    const createDto: CreateEventDto = {
      eventTypeId: 1,
      industryTypeId: 1,
      eventName: '设备故障事件',
      summary: '某设备发生故障',
      occurTime: new Date().toISOString(),
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      status: EventStatus.DRAFT,
      tagIds: [1, 2]
    };

    const event = await sdk.event.createEvent(createDto);
    console.log('事件创建成功:', event);

    // 2. 上传附件
    const files: File[] = [...]; // 从文件输入获取
    for (const file of files) {
      const attachment = await sdk.attachment.uploadAttachment(event.id, file);
      console.log('附件上传成功:', attachment);
    }

    // 3. 发布事件
    const publishedEvent = await sdk.event.publishEvent(event.id);
    console.log('事件发布成功:', publishedEvent);

    return publishedEvent;
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}
```
