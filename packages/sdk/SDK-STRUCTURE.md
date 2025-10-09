# SDK 目录结构

## 文件组织

```
packages/sdk/src/
├── types/                              # 类型定义目录
│   ├── common.types.ts                 # 通用类型（分页请求/响应）
│   ├── event.types.ts                  # 事件相关类型定义
│   ├── tag.types.ts                    # 标签类型定义
│   ├── attachment.types.ts             # 附件类型定义
│   ├── industry-type.types.ts          # 行业类型定义
│   └── event-type.types.ts             # 事件类型定义
│
├── api/                                # API 接口封装目录
│   ├── event-api.ts                    # 事件 API（列表、详情、CRUD、发布、归档等）
│   ├── tag-api.ts                      # 标签 API（CRUD、热门标签）
│   ├── attachment-api.ts               # 附件 API（上传、删除、排序）
│   ├── industry-type-api.ts            # 行业类型 API（CRUD）
│   └── event-type-api.ts               # 事件类型 API（CRUD、按行业查询）
│
├── client/                             # HTTP 客户端目录
│   └── http-client.ts                  # HTTP 客户端（GET/POST/PUT/DELETE、FormData支持）
│
└── index.ts                            # SDK 导出入口（SkerSDK 主类）
```

## 核心特性

### 1. 类型完整性
- ✅ 所有 API 方法都有完整的 TypeScript 类型定义
- ✅ 支持枚举类型（EventStatus、FileType）
- ✅ DTO 类型（Create/Update）
- ✅ 分页响应类型

### 2. HTTP 客户端
- ✅ 支持 GET/POST/PUT/DELETE 方法
- ✅ 自动处理 FormData（文件上传）
- ✅ 自动添加认证 Token（从 localStorage）
- ✅ 统一的错误处理

### 3. API 封装
- ✅ 事件管理（11个方法）
- ✅ 标签管理（6个方法）
- ✅ 附件管理（4个方法）
- ✅ 行业类型管理（5个方法）
- ✅ 事件类型管理（6个方法）

### 4. 统一导出
```typescript
// 使用 SkerSDK 主类
const sdk = new SkerSDK('http://localhost:3000');

// 访问各个 API
sdk.event.getEvents(params);
sdk.tag.getTags();
sdk.attachment.uploadAttachment(eventId, file);
sdk.industryType.getIndustryTypes();
sdk.eventType.getEventTypes();
```

## 已实现的功能

### 事件 API (EventApi)
- [x] 查询事件列表（支持分页、筛选）
- [x] 获取事件详情（含关联数据）
- [x] 创建事件
- [x] 更新事件
- [x] 删除事件
- [x] 发布事件
- [x] 归档事件
- [x] 查询附近事件（基于经纬度）
- [x] 按标签查询事件
- [x] 为事件添加标签
- [x] 移除事件标签

### 标签 API (TagApi)
- [x] 查询标签列表（支持分页、搜索）
- [x] 获取标签详情
- [x] 创建标签
- [x] 更新标签
- [x] 删除标签
- [x] 获取热门标签

### 附件 API (AttachmentApi)
- [x] 上传附件（支持 FormData）
- [x] 获取事件的所有附件
- [x] 删除附件
- [x] 批量更新附件排序

### 行业类型 API (IndustryTypeApi)
- [x] 查询行业类型列表
- [x] 获取行业类型详情
- [x] 创建行业类型
- [x] 更新行业类型
- [x] 删除行业类型

### 事件类型 API (EventTypeApi)
- [x] 查询事件类型列表
- [x] 获取事件类型详情
- [x] 按行业查询事件类型
- [x] 创建事件类型
- [x] 更新事件类型
- [x] 删除事件类型

## 编译结果

```bash
cd packages/sdk
pnpm build  # ✅ 编译成功
```

生成的类型声明文件：
- dist/types/*.d.ts
- dist/api/*.d.ts
- dist/client/*.d.ts

## 使用文档

参考 `README-EVENT-SDK.md` 获取详细的使用示例。
