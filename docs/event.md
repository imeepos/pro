# 事件管理系统设计方案

## 1. 数据库表设计

### 1.1 行业类型表 (industry_type)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| industry_code | varchar(50) | 行业类型编码 | UNIQUE, NOT NULL |
| industry_name | varchar(100) | 行业类型名称 | NOT NULL |
| description | text | 描述 | |
| sort_order | integer | 排序序号 | DEFAULT 0 |
| status | smallint | 状态(0:禁用 1:启用) | DEFAULT 1 |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamp | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (industry_code)
- INDEX (status)

### 1.2 事件类型表 (event_type)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| event_code | varchar(50) | 事件类型编码 | UNIQUE, NOT NULL |
| event_name | varchar(100) | 事件类型名称 | NOT NULL |
| industry_id | bigint | 所属行业类型ID | NOT NULL |
| description | text | 描述 | |
| sort_order | integer | 排序序号 | DEFAULT 0 |
| status | smallint | 状态(0:禁用 1:启用) | DEFAULT 1 |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamp | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (event_code)
- INDEX (industry_id)
- INDEX (status)

**外键约束：**
- FOREIGN KEY (industry_id) REFERENCES industry_type(id) ON DELETE RESTRICT

### 1.3 事件表 (event)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| event_type_id | bigint | 事件类型ID | NOT NULL |
| industry_type_id | bigint | 行业类型ID | NOT NULL |
| event_name | varchar(200) | 事件名称 | NOT NULL |
| summary | text | 简介 | |
| occur_time | timestamp | 发生时间 | NOT NULL |
| province | varchar(50) | 省份 | NOT NULL |
| city | varchar(50) | 城市 | NOT NULL |
| district | varchar(50) | 区/县 | NULL |
| street | varchar(100) | 街道/详细地址 | NULL |
| location_text | varchar(500) | 地点文字描述 | |
| longitude | numeric(10,7) | 经度 | |
| latitude | numeric(10,7) | 纬度 | |
| status | smallint | 状态(0:草稿 1:已发布 2:已归档) | DEFAULT 0 |
| created_by | bigint | 创建人ID | |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamp | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- INDEX (event_type_id)
- INDEX (industry_type_id)
- INDEX (occur_time)
- INDEX (province, city, district) 【联合索引，支持按地区查询】
- INDEX (status)
- GIST INDEX ON (ST_MakePoint(longitude, latitude)) 【PostGIS 空间索引，用于地理位置查询】

**外键约束：**
- FOREIGN KEY (event_type_id) REFERENCES event_type(id) ON DELETE RESTRICT
- FOREIGN KEY (industry_type_id) REFERENCES industry_type(id) ON DELETE RESTRICT

**说明：**
- `province/city` 必填，`district/street` 选填
- `longitude/latitude` 使用 numeric(10,7) 精确到约1厘米
- `status` 支持草稿、已发布、已归档三种状态
- `created_by` 记录创建人，便于追溯
- 支持 PostGIS 空间索引用于周边事件查询（需安装 PostGIS 扩展）

### 1.4 事件附件表 (event_attachment)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| event_id | bigint | 事件ID | NOT NULL |
| file_name | varchar(255) | 文件名 | NOT NULL |
| file_url | varchar(500) | MinIO文件URL | NOT NULL |
| bucket_name | varchar(100) | MinIO存储桶名称 | NOT NULL |
| object_name | varchar(500) | MinIO对象名称 | NOT NULL |
| file_type | varchar(50) | 文件类型(image/video/document) | NOT NULL |
| file_size | bigint | 文件大小(字节) | |
| mime_type | varchar(100) | MIME类型 | |
| sort_order | integer | 排序序号 | DEFAULT 0 |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- INDEX (event_id, sort_order) 【支持按事件查询并排序】

**外键约束：**
- FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE

**说明：**
- `file_type` 枚举值：image（图片）、video（视频）、document（文档）
- `mime_type` 记录具体类型如：image/jpeg、video/mp4、application/pdf
- 删除事件时级联删除附件记录（CASCADE），同时删除MinIO中的文件
- `sort_order` 支持附件排序展示
- `bucket_name/object_name` 记录MinIO存储信息，便于文件管理

### 1.5 标签表 (tag)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| tag_name | varchar(50) | 标签名称 | UNIQUE, NOT NULL |
| tag_color | varchar(20) | 标签颜色(hex) | DEFAULT '#1890ff' |
| usage_count | integer | 使用次数 | DEFAULT 0 |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamp | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (tag_name)
- INDEX (usage_count) 【支持按热度排序】

**说明：**
- `tag_name` 唯一，自动去重
- `tag_color` 支持自定义标签颜色
- `usage_count` 记录使用次数，支持热门标签推荐

### 1.6 事件标签关联表 (event_tag)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | bigserial | 主键ID | PRIMARY KEY |
| event_id | bigint | 事件ID | NOT NULL |
| tag_id | bigint | 标签ID | NOT NULL |
| created_at | timestamp | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (event_id, tag_id) 【防止重复关联】
- INDEX (tag_id) 【支持按标签查询事件】

**外键约束：**
- FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE
- FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE

**说明：**
- 多对多关系：一个事件可以有多个标签，一个标签可以关联多个事件
- 删除事件或标签时，自动删除关联关系

## 2. 关系说明

- **行业类型 ← 事件类型**：一个行业类型包含多个事件类型（1:N）
- **行业类型 ← 事件**：一个行业类型包含多个事件（1:N）
- **事件类型 ← 事件**：一个事件类型包含多个事件（1:N）
- **事件 ← 附件**：一个事件可以有多个附件（1:N）
- **事件 ↔ 标签**：一个事件可以有多个标签，一个标签可以关联多个事件（N:N）
- 事件同时关联行业类型和事件类型，便于按不同维度查询
- 删除行业/事件类型时，如存在关联事件则不允许删除（RESTRICT）
- 删除事件时，自动删除关联的所有附件记录和标签关联（CASCADE）
- 删除标签时，自动删除该标签与所有事件的关联（CASCADE）

## 3. 编码规则建议

### 行业类型编码 (industry_code)
- 格式：IND + 3位数字，如：IND001, IND002
- 预留足够的编码空间以便扩展

### 事件类型编码 (event_code)
- 格式：EVT + 行业编码后3位 + 3位序号
- 示例：EVT001001 (行业001的第001个事件)

## 4. API 接口设计（待讨论）

### 4.1 行业类型管理
- [ ] GET /api/industry-types - 查询行业类型列表
- [ ] GET /api/industry-types/:id - 查询单个行业类型
- [ ] POST /api/industry-types - 创建行业类型
- [ ] PUT /api/industry-types/:id - 更新行业类型
- [ ] DELETE /api/industry-types/:id - 删除行业类型

### 4.2 事件类型管理
- [ ] GET /api/event-types - 查询事件类型列表
- [ ] GET /api/event-types/:id - 查询单个事件类型
- [ ] POST /api/event-types - 创建事件类型
- [ ] PUT /api/event-types/:id - 更新事件类型
- [ ] DELETE /api/event-types/:id - 删除事件类型
- [ ] GET /api/event-types/by-industry/:industryId - 按行业查询事件类型

### 4.3 事件管理
- [ ] GET /api/events - 查询事件列表（支持分页、筛选）
  - 筛选条件：行业类型、事件类型、省份、城市、区县、时间范围、状态
- [ ] GET /api/events/:id - 查询单个事件详情（包含附件列表）
- [ ] POST /api/events - 创建事件
- [ ] PUT /api/events/:id - 更新事件
- [ ] DELETE /api/events/:id - 删除事件（级联删除附件）
- [ ] PUT /api/events/:id/publish - 发布事件（草稿→已发布）
- [ ] PUT /api/events/:id/archive - 归档事件（已发布→已归档）
- [ ] GET /api/events/nearby - 查询附近事件（基于经纬度）
  - 参数：longitude, latitude, radius(km)

### 4.4 事件附件管理
- [ ] POST /api/events/:eventId/attachments - 上传附件到MinIO
  - 支持文件类型：图片(jpg/png/gif)、视频(mp4/avi)、文档(pdf/doc/docx)
  - 无文件大小限制
  - 自动生成唯一的object_name
- [ ] GET /api/events/:eventId/attachments - 获取事件的所有附件
- [ ] DELETE /api/events/:eventId/attachments/:id - 删除单个附件（同时删除MinIO文件）
- [ ] PUT /api/events/:eventId/attachments/sort - 批量更新附件排序

### 4.5 标签管理
- [ ] GET /api/tags - 查询标签列表（支持分页、搜索）
  - 支持按使用次数排序（热门标签）
- [ ] GET /api/tags/:id - 查询单个标签
- [ ] POST /api/tags - 创建标签
- [ ] PUT /api/tags/:id - 更新标签（名称、颜色）
- [ ] DELETE /api/tags/:id - 删除标签（级联删除关联关系）
- [ ] GET /api/tags/popular - 获取热门标签（按usage_count排序）

### 4.6 事件标签关联
- [ ] POST /api/events/:eventId/tags - 为事件添加标签
  - 支持批量添加多个标签
  - 自动更新标签的usage_count
- [ ] DELETE /api/events/:eventId/tags/:tagId - 移除事件的某个标签
- [ ] GET /api/events/by-tag/:tagId - 按标签查询事件

## 5. 前端功能模块（待讨论）

### 5.1 行业类型管理页面
- 列表展示（支持分页、搜索、筛选）
- 新增/编辑表单
- 删除确认
- 启用/禁用状态切换

### 5.2 事件类型管理页面
- 列表展示（支持按行业筛选、分页、搜索）
- 新增/编辑表单（包含行业选择）
- 删除确认
- 启用/禁用状态切换

### 5.3 事件管理页面
- **列表页面**
  - 列表展示（支持分页、搜索）
  - 多维度筛选：行业类型、事件类型、省份、城市、区县、时间范围、状态、标签
  - 标签云展示（点击标签筛选）
  - 地图模式：在地图上展示事件位置（可点击查看详情）
  - 列表/地图切换
  - 批量操作：批量发布、批量归档、批量打标签
- **创建/编辑页面**
  - **基础信息**：事件名称、事件类型（联动行业类型）、简介
  - **时间地点**：
    - 发生时间选择器
    - 地址结构化输入：省份（必填）、城市（必填）、区/县（选填）、街道/详细地址（选填）
    - 地点文字描述
  - **地图选点**：在地图上标记经纬度（可根据地址自动定位）
  - **标签设置**：
    - 标签选择器（支持搜索）
    - 热门标签快速选择
    - 新建标签（输入名称、选择颜色）
    - 已选标签展示（可删除）
  - **附件上传**：
    - 支持多文件上传到MinIO
    - 支持图片/视频/文档（无大小限制）
    - 附件列表展示（缩略图、文件名、大小）
    - 支持拖拽排序
    - 支持删除
  - 草稿/发布状态选择
- **详情页面**
  - 事件完整信息展示
  - 结构化地址展示
  - 标签展示（彩色标签）
  - 地图位置展示
  - 附件展示（图片预览、视频播放、文档下载）
  - 编辑/删除/发布/归档操作按钮

### 5.4 标签管理页面
- 标签列表展示（支持分页、搜索）
- 按热度排序（usage_count）
- 标签统计（使用次数）
- 新增/编辑标签（名称、颜色）
- 删除标签（需确认）
- 标签详情：查看关联的所有事件

## 6. 待讨论问题

### ✅ 已确认需求
1. ✅ **地址结构化** - 省/市（必填）、区/街道（选填）
2. ✅ **附件功能** - 支持多附件上传（图片/视频/文档）
3. ✅ **文件存储** - 使用MinIO，无大小限制
4. ✅ **标签系统** - 支持自定义标签、标签颜色、热门标签

### 待确认需求（可选）
5. **是否需要关联人员？** 事件是否需要记录参与人员、负责人等信息？
6. **是否需要事件状态流转记录？** 记录事件从草稿→发布→归档的完整历史？
7. **事件类型是否需要层级结构？** 例如：一级分类、二级分类
8. **编码规则是否合适？** IND001、EVT001001 格式是否符合业务需求
9. **权限控制范围？** 哪些角色可以创建/编辑/发布/归档事件
10. **是否需要更详细的审计字段？** created_by, updated_by, deleted_by 等
11. **是否需要缩略图？** 图片是否自动生成缩略图以提升加载速度？

## 7. 数据查询场景

### 常见查询需求
1. **按行业查事件**：某个行业下的所有事件
2. **按事件类型查事件**：某个事件类型下的所有事件
3. **按地区查事件**：省份→城市→区县 三级联动查询
4. **按时间范围查事件**：某个时间段内的事件
5. **按标签查事件**：某个标签下的所有事件
6. **附近事件查询**：基于经纬度查询周边N公里内的事件
7. **综合查询**：多条件组合（行业+地区+时间范围+状态+标签）
8. **附件查询**：查询事件的所有附件（按类型筛选）
9. **热门标签查询**：按使用次数排序的标签列表

### 性能优化建议
- 对高频查询字段建立索引（已在表设计中体现）
- 地理位置查询使用空间索引
- 考虑对历史数据进行分区（按年/季度）
- 热点数据考虑Redis缓存

## 8. 实现计划（待确认）

### 阶段一：基础表和基础接口
1. 创建数据库迁移文件（industry_type, event_type, event, event_attachment, tag, event_tag）
2. 后端 Entity/DTO/Service/Controller 开发
3. 基础 CRUD 接口开发
4. 接口单元测试

### 阶段二：前端基础功能
5. 行业类型管理页面
6. 事件类型管理页面
7. 事件管理基础页面（列表、创建、编辑）
8. 省市区三级联动组件

### 阶段三：标签功能
9. 标签管理后端接口（CRUD、热门标签）
10. 事件标签关联接口
11. 标签管理页面
12. 事件列表标签筛选
13. 事件编辑页面标签选择器

### 阶段四：附件功能
14. MinIO 集成和配置
15. 文件上传服务（上传到MinIO）
16. 附件管理接口（上传、删除、排序）
17. 附件管理功能（前端）
18. 附件展示功能（图片预览、视频播放、文档下载）

### 阶段五：地图功能
19. 地图组件集成（高德/百度/腾讯地图）
20. 地图选点功能
21. 地图展示事件位置
22. 附近事件查询功能

### 阶段六：高级功能
23. 批量操作功能（批量发布、归档、打标签）
24. 地区筛选功能
25. 标签云展示
26. 数据初始化脚本

### 阶段七：优化和完善
27. 性能优化（索引优化、缓存）
28. 权限控制
29. 审计日志
30. 完整测试

---

## 当前方案总结

**六张核心表：**
- **行业类型表** (industry_type)：管理行业分类（编码+名称）
- **事件类型表** (event_type)：管理事件分类（编码+名称+所属行业）
- **事件表** (event)：核心业务表（包含事件类型、行业类型、名称、简介、时间、结构化地址、经纬度）
- **事件附件表** (event_attachment)：附件管理（MinIO存储、文件名、URL、类型、大小、排序）
- **标签表** (tag)：标签管理（标签名称、颜色、使用次数）
- **事件标签关联表** (event_tag)：事件与标签的多对多关系

**核心特性：**
✅ 支持行业和事件两级分类
✅ 支持结构化地址（省/市必填，区/街道选填）
✅ 支持地理位置（经纬度+空间索引）
✅ 支持多附件上传到MinIO（图片/视频/文档，无大小限制）
✅ 支持附件排序和管理
✅ 支持标签系统（自定义标签、标签颜色、热门标签）
✅ 支持事件状态管理（草稿/已发布/已归档）
✅ 支持附近事件查询
✅ 支持多维度筛选查询（包含标签筛选）

**已确认需求：**
✅ 地址结构化（省/市/区/街道）
✅ 多附件上传功能
✅ MinIO存储，无大小限制
✅ 标签系统

**待确认需求（可后续扩展）：**
- 是否需要关联人员？
- 是否需要事件状态流转记录？
- 事件类型是否需要层级结构？
- 是否需要缩略图生成？

---

## 9. 前端页面设计 (@pro/admin)

### 9.1 目录结构规划

```
apps/admin/src/app/features/events/
├── events-list.component.ts              # 事件列表主页面
├── events-list.component.html
├── events-list.component.scss
├── event-editor.component.ts             # 事件创建/编辑页面
├── event-editor.component.html
├── event-editor.component.scss
├── event-detail.component.ts             # 事件详情页面
├── event-detail.component.html
├── event-detail.component.scss
└── components/                           # 子组件目录
    ├── address-cascader.component.ts     # 省市区三级联动选择器
    ├── tag-selector.component.ts         # 标签选择器
    ├── attachment-uploader.component.ts  # 附件上传组件
    ├── amap-picker.component.ts          # 高德地图选点组件
    ├── amap-viewer.component.ts          # 高德地图展示组件
    ├── event-filter-panel.component.ts   # 事件筛选面板
    ├── tag-cloud.component.ts            # 标签云组件
    └── delete-event-dialog.component.ts  # 删除确认对话框

apps/admin/src/app/state/
├── events.service.ts                     # 事件业务逻辑服务
├── events.query.ts                       # 事件查询服务
├── events.store.ts                       # 事件状态存储
├── tags.service.ts                       # 标签业务逻辑服务
├── tags.query.ts                         # 标签查询服务
└── tags.store.ts                         # 标签状态存储

packages/sdk/src/
├── api/
│   ├── event-api.ts                      # 事件 API 接口（统一封装）
│   ├── tag-api.ts                        # 标签 API 接口
│   ├── attachment-api.ts                 # 附件 API 接口
│   ├── industry-type-api.ts              # 行业类型 API 接口
│   └── event-type-api.ts                 # 事件类型 API 接口
├── types/
│   ├── event.types.ts                    # 事件相关类型定义
│   ├── tag.types.ts                      # 标签类型定义
│   ├── attachment.types.ts               # 附件类型定义
│   └── common.types.ts                   # 通用类型定义
└── index.ts                              # SDK 导出入口
```

### 9.2 路由配置

```typescript
// apps/admin/src/app/app.routes.ts
{
  path: 'events',
  children: [
    { path: '', component: EventsListComponent },           // 事件列表
    { path: 'create', component: EventEditorComponent },    // 创建事件
    { path: 'edit/:id', component: EventEditorComponent },  // 编辑事件
    { path: 'detail/:id', component: EventDetailComponent } // 事件详情
  ]
}
```

### 9.3 页面组件功能划分

#### 9.3.1 事件列表页面 (EventsListComponent)

**核心功能：**
- 事件列表展示（表格/卡片视图）
- 分页、搜索
- 多维度筛选
- 列表/地图切换
- 批量操作
- 标签云展示

**子组件：**
- `<app-event-filter-panel>` - 筛选面板
- `<app-tag-cloud>` - 标签云
- `<app-amap-viewer>` - 地图视图（地图模式）
- `<app-delete-event-dialog>` - 删除确认对话框

**状态管理：**
```typescript
// 订阅的状态
events$ = this.eventsQuery.events$;
loading$ = this.eventsQuery.loading$;
total$ = this.eventsQuery.total$;
tags$ = this.tagsQuery.tags$;

// 筛选条件
filterParams = {
  industryTypeId?: number;
  eventTypeId?: number;
  province?: string;
  city?: string;
  district?: string;
  startTime?: string;
  endTime?: string;
  status?: number;
  tagIds?: number[];
  keyword?: string;
  page: number;
  pageSize: number;
}

// 视图模式
viewMode: 'list' | 'map' = 'list';

// 选中的事件（批量操作）
selectedEvents: Event[] = [];
```

**操作方法：**
```typescript
loadEvents(): void                        // 加载事件列表
onFilterChange(params): void              // 筛选条件变化
switchView(mode): void                    // 切换视图
onSearch(keyword): void                   // 搜索
onTagClick(tagId): void                   // 点击标签筛选
createEvent(): void                       // 跳转创建页面
editEvent(id): void                       // 跳转编辑页面
viewDetail(id): void                      // 查看详情
deleteEvent(id): void                     // 删除事件
batchPublish(): void                      // 批量发布
batchArchive(): void                      // 批量归档
batchTag(): void                          // 批量打标签
```

#### 9.3.2 事件编辑页面 (EventEditorComponent)

**核心功能：**
- 表单编辑（创建/编辑复用）
- 实时表单验证
- 自动保存草稿
- 数据回填（编辑模式）

**子组件：**
- `<app-address-cascader>` - 地址选择器
- `<app-amap-picker>` - 地图选点
- `<app-tag-selector>` - 标签选择器
- `<app-attachment-uploader>` - 附件上传

**表单结构：**
```typescript
eventForm = {
  // 基础信息
  eventName: string;              // 事件名称 *
  eventTypeId: number;            // 事件类型 *
  industryTypeId: number;         // 行业类型 *（联动）
  summary: string;                // 简介

  // 时间地点
  occurTime: Date;                // 发生时间 *
  province: string;               // 省份 *
  city: string;                   // 城市 *
  district?: string;              // 区/县
  street?: string;                // 街道/详细地址
  locationText?: string;          // 地点文字描述
  longitude?: number;             // 经度
  latitude?: number;              // 纬度

  // 标签
  tagIds: number[];               // 标签ID列表

  // 附件
  attachments: Attachment[];      // 附件列表

  // 状态
  status: 0 | 1 | 2;             // 0:草稿 1:已发布 2:已归档
}
```

**操作方法：**
```typescript
loadEvent(id): void                       // 加载事件数据（编辑模式）
onEventTypeChange(eventTypeId): void      // 事件类型变化（联动行业）
onAddressChange(address): void            // 地址变化（自动定位）
onMapPick(lngLat): void                   // 地图选点
onAddressAutoLocate(): void               // 地址自动定位到地图
onTagChange(tagIds): void                 // 标签变化
onAttachmentChange(files): void           // 附件变化
saveDraft(): void                         // 保存草稿
publish(): void                           // 发布
cancel(): void                            // 取消/返回
```

**表单验证规则：**
```typescript
validators = {
  eventName: [required, maxLength(200)],
  eventTypeId: [required],
  industryTypeId: [required],
  occurTime: [required],
  province: [required],
  city: [required],
  longitude: [min(-180), max(180)],
  latitude: [min(-90), max(90)]
}
```

#### 9.3.3 事件详情页面 (EventDetailComponent)

**核心功能：**
- 事件完整信息展示
- 附件预览/下载
- 操作按钮

**子组件：**
- `<app-amap-viewer>` - 地图位置展示

**展示内容：**
```typescript
eventDetail = {
  // 基础信息
  eventName: string;
  eventType: EventType;           // 含行业信息
  industryType: IndustryType;
  summary: string;
  status: number;

  // 时间地点
  occurTime: Date;
  address: {                      // 结构化地址
    province: string;
    city: string;
    district?: string;
    street?: string;
    fullAddress: string;          // 完整地址拼接
  };
  locationText?: string;
  location?: {
    longitude: number;
    latitude: number;
  };

  // 标签
  tags: Tag[];                    // 标签列表（含颜色）

  // 附件
  attachments: Attachment[];      // 附件列表

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy?: User;
}
```

**操作方法：**
```typescript
loadEventDetail(id): void                 // 加载事件详情
edit(): void                              // 编辑
delete(): void                            // 删除
publish(): void                           // 发布（草稿→已发布）
archive(): void                           // 归档（已发布→已归档）
downloadAttachment(attachment): void      // 下载附件
previewAttachment(attachment): void       // 预览附件（图片/视频）
```

### 9.4 子组件详细设计

#### 9.4.1 地址级联选择器 (AddressCascaderComponent)

**输入：**
```typescript
@Input() province?: string;
@Input() city?: string;
@Input() district?: string;
@Input() disabled = false;
```

**输出：**
```typescript
@Output() addressChange = new EventEmitter<{
  province: string;
  city: string;
  district?: string;
}>();
```

**功能：**
- 省市区三级联动
- 支持清空
- 支持禁用

**数据源：**
```typescript
// 使用静态数据或从后端获取
provinces: string[];
cities: { [province: string]: string[] };
districts: { [city: string]: string[] };
```

#### 9.4.2 高德地图选点组件 (AmapPickerComponent)

**输入：**
```typescript
@Input() longitude?: number;
@Input() city?: string;              // 用于初始化地图中心
@Input() height = '400px';
```

**输出：**
```typescript
@Output() locationPick = new EventEmitter<{
  longitude: number;
  latitude: number;
  address?: string;                 // 逆地理编码得到的地址
}>();
```

**功能：**
- 地图选点（点击/拖拽标记）
- 地址搜索定位
- 根据地址自动定位
- 逆地理编码

**集成高德地图：**
```typescript
// 使用 @amap/amap-jsapi-loader
import AMapLoader from '@amap/amap-jsapi-loader';

// 初始化地图
async initMap() {
  const AMap = await AMapLoader.load({
    key: 'YOUR_AMAP_KEY',
    version: '2.0',
    plugins: ['AMap.Geocoder', 'AMap.PlaceSearch']
  });

  this.map = new AMap.Map('map-container', {
    zoom: 13,
    center: [this.longitude, this.latitude]
  });

  // 添加点击事件
  this.map.on('click', (e) => {
    this.onMapClick(e.lnglat);
  });
}
```

#### 9.4.3 标签选择器 (TagSelectorComponent)

**输入：**
```typescript
@Input() selectedTagIds: number[] = [];
@Input() maxTags = 10;               // 最多选择标签数
```

**输出：**
```typescript
@Output() tagsChange = new EventEmitter<number[]>();
```

**功能：**
- 标签搜索
- 热门标签快速选择
- 新建标签（名称+颜色）
- 已选标签展示（可删除）
- 标签数量限制

**UI结构：**
```
┌─────────────────────────────────┐
│ 搜索框: [________] [新建标签]   │
├─────────────────────────────────┤
│ 热门标签: [标签1] [标签2] ...   │
├─────────────────────────────────┤
│ 已选标签:                       │
│ [标签A ×] [标签B ×] [标签C ×]  │
└─────────────────────────────────┘
```

#### 9.4.4 附件上传组件 (AttachmentUploaderComponent)

**输入：**
```typescript
@Input() attachments: Attachment[] = [];
@Input() maxFiles = 20;
@Input() acceptTypes = 'image/*,video/*,.pdf,.doc,.docx';
```

**输出：**
```typescript
@Output() attachmentsChange = new EventEmitter<Attachment[]>();
```

**功能：**
- 多文件上传
- 拖拽上传
- 文件类型验证
- 上传进度显示
- 附件列表展示（缩略图、文件名、大小）
- 拖拽排序
- 删除附件

**附件数据结构：**
```typescript
interface Attachment {
  id?: number;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'video' | 'document';
  fileSize: number;
  mimeType: string;
  sortOrder: number;
  uploadProgress?: number;        // 上传进度 0-100
  thumbnail?: string;             // 缩略图URL（图片）
}
```

#### 9.4.5 事件筛选面板 (EventFilterPanelComponent)

**输入：**
```typescript
@Input() filterParams: EventFilterParams;
```

**输出：**
```typescript
@Output() filterChange = new EventEmitter<EventFilterParams>();
@Output() reset = new EventEmitter<void>();
```

**筛选项：**
```typescript
interface EventFilterParams {
  industryTypeId?: number;        // 行业类型
  eventTypeId?: number;           // 事件类型
  province?: string;              // 省份
  city?: string;                  // 城市
  district?: string;              // 区县
  startTime?: string;             // 开始时间
  endTime?: string;               // 结束时间
  status?: number;                // 状态
  tagIds?: number[];              // 标签
  keyword?: string;               // 关键词
}
```

**UI布局：**
```
┌─────────────────────────────────┐
│ 行业类型: [下拉选择]             │
│ 事件类型: [下拉选择]             │
│ 地区: [省] [市] [区]             │
│ 时间范围: [开始时间] - [结束时间] │
│ 状态: □草稿 □已发布 □已归档     │
│ 标签: [标签选择器]               │
│ [重置] [查询]                    │
└─────────────────────────────────┘
```

#### 9.4.6 标签云组件 (TagCloudComponent)

**输入：**
```typescript
@Input() tags: Tag[];
@Input() selectedTagIds: number[] = [];
```

**输出：**
```typescript
@Output() tagClick = new EventEmitter<number>();
```

**功能：**
- 标签按使用次数排序
- 使用次数越多，字体越大
- 点击标签筛选
- 高亮已选标签

**UI效果：**
```
[标签1(100)] [标签2(80)] [标签3(60)] [标签4(40)] ...
大            中          中小        小
```

### 9.5 高德地图集成配置

**安装依赖：**
```bash
pnpm add @amap/amap-jsapi-loader --filter=@pro/admin
```

**环境变量配置：**
```typescript
// apps/admin/src/environments/environment.ts
export const environment = {
  production: false,
  amapKey: 'YOUR_AMAP_API_KEY',
  amapSecurityCode: 'YOUR_AMAP_SECURITY_CODE'
};
```

**地图服务：**
```typescript
// apps/admin/src/app/core/services/amap.service.ts
@Injectable({ providedIn: 'root' })
export class AmapService {
  private AMap: any;

  async loadAMap(): Promise<any> {
    if (this.AMap) return this.AMap;

    this.AMap = await AMapLoader.load({
      key: environment.amapKey,
      version: '2.0',
      plugins: [
        'AMap.Geocoder',
        'AMap.PlaceSearch',
        'AMap.AutoComplete',
        'AMap.MarkerCluster'
      ]
    });

    return this.AMap;
  }

  // 地理编码：地址 → 经纬度
  async geocode(address: string): Promise<[number, number]> { }

  // 逆地理编码：经纬度 → 地址
  async regeocode(lnglat: [number, number]): Promise<string> { }
}
```

### 9.6 @pro/sdk API 封装设计

#### 9.6.1 SDK 目录结构

```
packages/sdk/src/
├── api/
│   ├── event-api.ts                      # 事件 API
│   ├── tag-api.ts                        # 标签 API
│   ├── attachment-api.ts                 # 附件 API
│   ├── industry-type-api.ts              # 行业类型 API
│   └── event-type-api.ts                 # 事件类型 API
├── types/
│   ├── event.types.ts                    # 事件类型定义
│   ├── tag.types.ts                      # 标签类型定义
│   ├── attachment.types.ts               # 附件类型定义
│   ├── industry-type.types.ts            # 行业类型定义
│   ├── event-type.types.ts               # 事件类型定义
│   └── common.types.ts                   # 通用类型定义
├── client/
│   └── http-client.ts                    # HTTP 客户端封装
└── index.ts                              # SDK 导出
```

#### 9.6.2 类型定义示例

**common.types.ts**
```typescript
// 分页请求参数
export interface PageRequest {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 响应包装
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

**event.types.ts**
```typescript
// 事件状态
export enum EventStatus {
  DRAFT = 0,
  PUBLISHED = 1,
  ARCHIVED = 2
}

// 事件实体
export interface Event {
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

// 创建事件 DTO
export interface CreateEventDto {
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
  status?: EventStatus;
  tagIds?: number[];
}

// 更新事件 DTO
export interface UpdateEventDto extends Partial<CreateEventDto> {
  id: number;
}

// 事件查询参数
export interface EventQueryParams extends PageRequest {
  industryTypeId?: number;
  eventTypeId?: number;
  province?: string;
  city?: string;
  district?: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
  tagIds?: number[];
  keyword?: string;
}

// 事件详情（含关联数据）
export interface EventDetail extends Event {
  eventType?: EventType;
  industryType?: IndustryType;
  tags?: Tag[];
  attachments?: Attachment[];
}
```

**tag.types.ts**
```typescript
export interface Tag {
  id: number;
  tagName: string;
  tagColor: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagDto {
  tagName: string;
  tagColor?: string;
}

export interface UpdateTagDto {
  id: number;
  tagName?: string;
  tagColor?: string;
}
```

**attachment.types.ts**
```typescript
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

export interface Attachment {
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

export interface UploadAttachmentDto {
  eventId: number;
  file: File;
}
```

#### 9.6.3 API 接口封装示例

**event-api.ts**
```typescript
import { HttpClient } from './http-client';
import {
  Event,
  EventDetail,
  CreateEventDto,
  UpdateEventDto,
  EventQueryParams,
  PageResponse,
  ApiResponse
} from '../types';

export class EventApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  // 查询事件列表
  async getEvents(params: EventQueryParams): Promise<PageResponse<Event>> {
    return this.http.get<PageResponse<Event>>('/api/events', params);
  }

  // 获取事件详情
  async getEventById(id: number): Promise<EventDetail> {
    return this.http.get<EventDetail>(`/api/events/${id}`);
  }

  // 创建事件
  async createEvent(dto: CreateEventDto): Promise<Event> {
    return this.http.post<Event>('/api/events', dto);
  }

  // 更新事件
  async updateEvent(id: number, dto: UpdateEventDto): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}`, dto);
  }

  // 删除事件
  async deleteEvent(id: number): Promise<void> {
    return this.http.delete(`/api/events/${id}`);
  }

  // 发布事件
  async publishEvent(id: number): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}/publish`, {});
  }

  // 归档事件
  async archiveEvent(id: number): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}/archive`, {});
  }

  // 查询附近事件
  async getNearbyEvents(
    longitude: number,
    latitude: number,
    radius: number
  ): Promise<Event[]> {
    return this.http.get<Event[]>('/api/events/nearby', {
      longitude,
      latitude,
      radius
    });
  }

  // 按标签查询事件
  async getEventsByTag(tagId: number): Promise<Event[]> {
    return this.http.get<Event[]>(`/api/events/by-tag/${tagId}`);
  }

  // 为事件添加标签
  async addTagsToEvent(eventId: number, tagIds: number[]): Promise<void> {
    return this.http.post(`/api/events/${eventId}/tags`, { tagIds });
  }

  // 移除事件标签
  async removeTagFromEvent(eventId: number, tagId: number): Promise<void> {
    return this.http.delete(`/api/events/${eventId}/tags/${tagId}`);
  }
}
```

**tag-api.ts**
```typescript
import { HttpClient } from './http-client';
import { Tag, CreateTagDto, UpdateTagDto, PageResponse } from '../types';

export class TagApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  // 查询标签列表
  async getTags(params?: { page?: number; pageSize?: number; keyword?: string }): Promise<PageResponse<Tag>> {
    return this.http.get<PageResponse<Tag>>('/api/tags', params);
  }

  // 获取标签详情
  async getTagById(id: number): Promise<Tag> {
    return this.http.get<Tag>(`/api/tags/${id}`);
  }

  // 创建标签
  async createTag(dto: CreateTagDto): Promise<Tag> {
    return this.http.post<Tag>('/api/tags', dto);
  }

  // 更新标签
  async updateTag(id: number, dto: UpdateTagDto): Promise<Tag> {
    return this.http.put<Tag>(`/api/tags/${id}`, dto);
  }

  // 删除标签
  async deleteTag(id: number): Promise<void> {
    return this.http.delete(`/api/tags/${id}`);
  }

  // 获取热门标签
  async getPopularTags(limit = 20): Promise<Tag[]> {
    return this.http.get<Tag[]>('/api/tags/popular', { limit });
  }
}
```

**attachment-api.ts**
```typescript
import { HttpClient } from './http-client';
import { Attachment } from '../types';

export class AttachmentApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  // 上传附件
  async uploadAttachment(eventId: number, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`/api/events/${eventId}/attachments`, formData);
  }

  // 获取事件的所有附件
  async getAttachments(eventId: number): Promise<Attachment[]> {
    return this.http.get<Attachment[]>(`/api/events/${eventId}/attachments`);
  }

  // 删除附件
  async deleteAttachment(eventId: number, attachmentId: number): Promise<void> {
    return this.http.delete(`/api/events/${eventId}/attachments/${attachmentId}`);
  }

  // 批量更新附件排序
  async updateAttachmentsSort(
    eventId: number,
    attachments: { id: number; sortOrder: number }[]
  ): Promise<void> {
    return this.http.put(`/api/events/${eventId}/attachments/sort`, { attachments });
  }
}
```

#### 9.6.4 HTTP 客户端封装

**http-client.ts**
```typescript
export class HttpClient {
  constructor(private baseUrl: string) {}

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    params?: any
  ): Promise<T> {
    const fullUrl = new URL(url, this.baseUrl);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          fullUrl.searchParams.append(key, params[key]);
        }
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // 添加认证 token
        'Authorization': `Bearer ${this.getToken()}`
      }
    };

    if (data) {
      if (data instanceof FormData) {
        delete options.headers['Content-Type'];
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(fullUrl.toString(), options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async get<T>(url: string, params?: any): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  private getToken(): string | null {
    // 从 localStorage 或其他地方获取 token
    return localStorage.getItem('auth_token');
  }
}
```

#### 9.6.5 SDK 导出

**index.ts**
```typescript
export * from './types/event.types';
export * from './types/tag.types';
export * from './types/attachment.types';
export * from './types/industry-type.types';
export * from './types/event-type.types';
export * from './types/common.types';

export { EventApi } from './api/event-api';
export { TagApi } from './api/tag-api';
export { AttachmentApi } from './api/attachment-api';
export { IndustryTypeApi } from './api/industry-type-api';
export { EventTypeApi } from './api/event-type-api';

// SDK 主类
export class SkerSDK {
  public event: EventApi;
  public tag: TagApi;
  public attachment: AttachmentApi;
  public industryType: IndustryTypeApi;
  public eventType: EventTypeApi;

  constructor(baseUrl: string) {
    this.event = new EventApi(baseUrl);
    this.tag = new TagApi(baseUrl);
    this.attachment = new AttachmentApi(baseUrl);
    this.industryType = new IndustryTypeApi(baseUrl);
    this.eventType = new EventTypeApi(baseUrl);
  }
}
```

#### 9.6.6 在 @pro/admin 中使用

**apps/admin/src/app/state/events.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { SkerSDK, Event, CreateEventDto, EventQueryParams } from '@pro/sdk';
import { BehaviorSubject, Observable } from 'rxjs';
import { EventsStore } from './events.store';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private sdk: SkerSDK;

  constructor(private store: EventsStore) {
    this.sdk = new SkerSDK(environment.apiUrl);
  }

  async loadEvents(params: EventQueryParams): Promise<void> {
    this.store.setLoading(true);
    try {
      const response = await this.sdk.event.getEvents(params);
      this.store.setEvents(response.data);
      this.store.setTotal(response.total);
    } catch (error) {
      this.store.setError(error.message);
    } finally {
      this.store.setLoading(false);
    }
  }

  async createEvent(dto: CreateEventDto): Promise<Event> {
    return this.sdk.event.createEvent(dto);
  }

  async deleteEvent(id: number): Promise<void> {
    await this.sdk.event.deleteEvent(id);
    this.store.removeEvent(id);
  }

  // ... 其他方法
}
```

### 9.7 技术栈和依赖

**核心技术：**
- Angular 17+ (Standalone Components)
- RxJS 7+
- Tailwind CSS
- 高德地图 JS API 2.0
- @pro/sdk (统一 API 封装)

**需要安装的依赖：**
```bash
# 前端依赖
pnpm add @amap/amap-jsapi-loader --filter=@pro/admin

# SDK 在 workspace 中已存在，无需额外安装
```

**状态管理模式：**
使用 Service + BehaviorSubject 模式（参考现有的 screens.service.ts）

**API 调用层级：**
```
Component → Service (业务逻辑) → SDK (API封装) → 后端 API
```

### 9.8 待确认问题

1. **是否需要地图聚合功能？** 在地图模式下，大量事件点是否需要聚合显示？
2. **是否需要导入导出功能？** 批量导入事件、导出事件数据（Excel）
3. **是否需要事件模板？** 快速创建相似事件
4. **是否需要移动端适配？** 响应式设计的优先级
5. **附件预览方式？** 是否需要集成图片/视频预览组件库，还是使用原生方式

---

## 当前方案总结（含 SDK 封装）

**架构设计：**
```
┌─────────────────────────────────────────────────┐
│  @pro/admin (Angular 前端)                      │
│  ┌──────────────────────────────────────────┐  │
│  │ Components (页面组件)                     │  │
│  │   ↓                                       │  │
│  │ Services (业务逻辑 + 状态管理)            │  │
│  │   ↓                                       │  │
│  │ @pro/sdk (API 统一封装)                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────────────┐
│  @pro/api (NestJS 后端)                         │
│  ┌──────────────────────────────────────────┐  │
│  │ Controllers                               │  │
│  │   ↓                                       │  │
│  │ Services (业务逻辑)                       │  │
│  │   ↓                                       │  │
│  │ Repositories (数据访问)                   │  │
│  │   ↓                                       │  │
│  │ TypeORM Entities                          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PostgreSQL Database (数据库)                   │
│  - industry_type (行业类型表)                   │
│  - event_type (事件类型表)                      │
│  - event (事件表)                               │
│  - event_attachment (附件表)                    │
│  - tag (标签表)                                 │
│  - event_tag (事件标签关联表)                   │
│                                                 │
│  扩展: PostGIS (地理空间查询)                   │
└─────────────────────────────────────────────────┘
```

**核心模块：**

1. **数据库层** - 6张核心表设计完成
2. **后端 API 层** - 待实现（NestJS）
3. **SDK 封装层** - 设计完成（@pro/sdk）
   - 类型定义（TypeScript）
   - API 接口封装
   - HTTP 客户端
4. **前端业务层** - 设计完成（@pro/admin）
   - 状态管理（Service + Store + Query）
   - 页面组件（3个主页面 + 8个子组件）
   - 高德地图集成

**技术栈确认：**
- 前端：Angular 17+ Standalone Components + RxJS + Tailwind CSS
- SDK：TypeScript + Fetch API
- 后端：NestJS + TypeORM (待实现)
- 数据库：PostgreSQL 14+
- 文件存储：MinIO
- 地图：高德地图 JS API 2.0
- 地理扩展：PostGIS（用于空间索引和地理查询）

**设计方案已完善，包含 SDK 统一封装。是否开始实现阶段一（数据库迁移文件+基础Entity/接口）？**
