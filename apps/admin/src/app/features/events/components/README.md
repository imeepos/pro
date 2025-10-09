# Events 基础组件库

本目录包含事件管理系统的所有前端基础组件。所有组件都是 Angular Standalone Components，使用 Tailwind CSS 进行样式设计。

## 组件列表

### 1. AddressCascaderComponent - 省市区三级联动选择器

**用途**: 结构化地址输入，支持省、市、区三级联动选择

**输入属性**:
- `province?: string` - 默认省份
- `city?: string` - 默认城市
- `district?: string` - 默认区县
- `disabled: boolean = false` - 是否禁用
- `showFullAddress: boolean = true` - 是否显示完整地址

**输出事件**:
- `addressChange: EventEmitter<AddressData>` - 地址变化事件

**使用示例**:
```typescript
<app-address-cascader
  [province]="'广东省'"
  [city]="'深圳市'"
  (addressChange)="onAddressChange($event)"
></app-address-cascader>
```

---

### 2. TagSelectorComponent - 标签选择器

**用途**: 标签选择、搜索、创建功能，支持热门标签快速选择

**输入属性**:
- `selectedTagIds: number[] = []` - 已选标签ID列表
- `maxTags: number = 10` - 最多可选标签数
- `allTags: Tag[] = []` - 所有可用标签
- `popularTags: Tag[] = []` - 热门标签列表

**输出事件**:
- `tagsChange: EventEmitter<number[]>` - 标签选择变化
- `tagCreate: EventEmitter<{name: string; color: string}>` - 创建新标签

**使用示例**:
```typescript
<app-tag-selector
  [selectedTagIds]="selectedTags"
  [allTags]="allTags"
  [popularTags]="popularTags"
  [maxTags]="10"
  (tagsChange)="onTagsChange($event)"
  (tagCreate)="onCreateTag($event)"
></app-tag-selector>
```

---

### 3. AttachmentUploaderComponent - 附件上传组件

**用途**: 文件上传、预览、排序管理，支持拖拽上传

**输入属性**:
- `attachments: Attachment[] = []` - 附件列表
- `maxFiles: number = 20` - 最大文件数
- `maxFileSizeMB: number = 100` - 单文件最大大小(MB)
- `acceptTypes: string` - 可接受的文件类型

**输出事件**:
- `attachmentsChange: EventEmitter<Attachment[]>` - 附件列表变化
- `fileUpload: EventEmitter<File>` - 文件上传事件

**使用示例**:
```typescript
<app-attachment-uploader
  [attachments]="attachments"
  [maxFiles]="20"
  [maxFileSizeMB]="100"
  (attachmentsChange)="onAttachmentsChange($event)"
  (fileUpload)="onFileUpload($event)"
></app-attachment-uploader>
```

---

### 4. AmapPickerComponent - 高德地图选点组件

**用途**: 在地图上选择位置，支持地址搜索和逆地理编码

**输入属性**:
- `longitude?: number` - 初始经度
- `latitude?: number` - 初始纬度
- `city?: string` - 初始城市
- `height: string = '400px'` - 地图高度
- `amapKey: string` - 高德地图 API Key

**输出事件**:
- `locationPick: EventEmitter<LocationData>` - 位置选择事件

**使用示例**:
```typescript
<app-amap-picker
  [longitude]="longitude"
  [latitude]="latitude"
  [city]="'深圳市'"
  [height]="'500px'"
  [amapKey]="environment.amapKey"
  (locationPick)="onLocationPick($event)"
></app-amap-picker>
```

**注意**: 需要配置高德地图 API Key

---

### 5. AmapViewerComponent - 高德地图展示组件

**用途**: 在地图上展示事件位置点，支持标记聚合

**输入属性**:
- `longitude?: number` - 中心点经度
- `latitude?: number` - 中心点纬度
- `markers: EventMarker[] = []` - 事件标记列表
- `height: string = '400px'` - 地图高度
- `zoom: number = 13` - 缩放级别
- `enableClustering: boolean = false` - 是否启用聚合
- `amapKey: string` - 高德地图 API Key

**使用示例**:
```typescript
<app-amap-viewer
  [markers]="eventMarkers"
  [height]="'600px'"
  [zoom]="12"
  [enableClustering]="true"
  [amapKey]="environment.amapKey"
></app-amap-viewer>
```

---

### 6. EventFilterPanelComponent - 事件筛选面板

**用途**: 多条件筛选事件，包括行业、类型、地区、时间、状态、标签

**输入属性**:
- `filterParams: EventFilterParams = {}` - 筛选参数
- `industryTypes: IndustryType[] = []` - 行业类型列表
- `eventTypes: EventType[] = []` - 事件类型列表
- `tags: Tag[] = []` - 标签列表

**输出事件**:
- `filterChange: EventEmitter<EventFilterParams>` - 筛选条件变化
- `reset: EventEmitter<void>` - 重置筛选

**使用示例**:
```typescript
<app-event-filter-panel
  [filterParams]="filterParams"
  [industryTypes]="industryTypes"
  [eventTypes]="eventTypes"
  [tags]="tags"
  (filterChange)="onFilterChange($event)"
  (reset)="onFilterReset()"
></app-event-filter-panel>
```

---

### 7. TagCloudComponent - 标签云组件

**用途**: 以标签云形式展示热门标签，字体大小根据使用频率自动调整

**输入属性**:
- `tags: Tag[] = []` - 标签列表
- `selectedTagIds: number[] = []` - 已选标签ID
- `minFontSize: number = 12` - 最小字体大小
- `maxFontSize: number = 20` - 最大字体大小

**输出事件**:
- `tagClick: EventEmitter<number>` - 标签点击事件

**使用示例**:
```typescript
<app-tag-cloud
  [tags]="tags"
  [selectedTagIds]="selectedTags"
  [minFontSize]="12"
  [maxFontSize]="24"
  (tagClick)="onTagClick($event)"
></app-tag-cloud>
```

---

### 8. DeleteEventDialogComponent - 删除确认对话框

**用途**: 删除事件时的二次确认对话框，需要输入事件名称确认

**输入属性**:
- `event: EventData | null` - 待删除的事件数据
- `isVisible: boolean = false` - 是否显示对话框

**输出事件**:
- `confirm: EventEmitter<void>` - 确认删除
- `cancel: EventEmitter<void>` - 取消删除

**使用示例**:
```typescript
<app-delete-event-dialog
  [event]="eventToDelete"
  [isVisible]="showDeleteDialog"
  (confirm)="onDeleteConfirm()"
  (cancel)="onDeleteCancel()"
></app-delete-event-dialog>
```

---

## 类型定义

所有组件使用的类型定义都已在组件文件中导出，可以直接引用：

```typescript
import {
  AddressData,
  Tag,
  Attachment,
  FileType,
  LocationData,
  EventMarker,
  EventFilterParams,
  IndustryType,
  EventType,
  EventData
} from './components';
```

## 依赖

### 必需依赖
- `@angular/core` ^17.3.0
- `@angular/common` ^17.3.0
- `@angular/forms` ^17.3.0
- `@amap/amap-jsapi-loader` ^1.0.1 (地图组件)

### 样式
- 所有组件使用 Tailwind CSS
- 确保项目已正确配置 Tailwind CSS

## 环境配置

### 高德地图 API Key

使用地图组件前需要配置高德地图 API Key：

```typescript
// apps/admin/src/environments/environment.ts
export const environment = {
  production: false,
  amapKey: 'YOUR_AMAP_API_KEY',
  amapSecurityCode: 'YOUR_AMAP_SECURITY_CODE' // 可选
};
```

在 `index.html` 中配置安全密钥（可选）:
```html
<script>
  window._AMapSecurityConfig = {
    securityJsCode: 'YOUR_AMAP_SECURITY_CODE',
  }
</script>
```

## 设计原则

1. **存在即合理**: 每个组件都有明确的职责，不包含冗余功能
2. **优雅即简约**: 代码简洁，命名清晰，自我文档化
3. **组件独立**: 所有组件都是 Standalone，可独立使用
4. **类型安全**: 完整的 TypeScript 类型定义
5. **可复用性**: 通过 @Input/@Output 实现灵活的组件通信

## 后续计划

这些基础组件将用于构建以下页面：
- 事件列表页面 (EventsListComponent)
- 事件创建/编辑页面 (EventEditorComponent)
- 事件详情页面 (EventDetailComponent)

详细设计请参考: `/home/ubuntu/worktrees/pro/docs/event.md`
