# FileUploadComponent - 通用文件上传组件

优雅的文件上传组件，支持多种文档格式的上传、进度显示和文件管理。

## 功能特性

- 文件选择和拖拽上传
- 实时上传进度显示
- 多文件上传支持
- 文件类型和大小验证
- 显示文件图标（根据MIME类型）
- 显示文件信息（名称、大小）
- 删除已上传文件
- 完善的错误处理
- 响应式设计
- 支持深色模式

## 使用方式

### 基础用法

```typescript
import { Component } from '@angular/core';
import { FileUploadComponent } from '@app/shared';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [FileUploadComponent],
  template: `
    <app-file-upload
      [eventId]="eventId"
      (uploadSuccess)="onUploadSuccess($event)"
      (uploadError)="onUploadError($event)"
      (deleteSuccess)="onDeleteSuccess($event)"
    />
  `
})
export class ExampleComponent {
  eventId = '123';

  onUploadSuccess(attachment: Attachment): void {
    console.log('上传成功:', attachment);
  }

  onUploadError(error: Error): void {
    console.error('上传失败:', error);
  }

  onDeleteSuccess(attachmentId: string): void {
    console.log('删除成功:', attachmentId);
  }
}
```

### 自定义配置

```typescript
<app-file-upload
  [eventId]="eventId"
  [multiple]="true"
  [maxCount]="10"
  [maxSize]="50 * 1024 * 1024"
  [accept]="'.pdf,.doc,.docx,.xls,.xlsx,.txt'"
  [disabled]="false"
  (uploadSuccess)="onUploadSuccess($event)"
  (uploadError)="onUploadError($event)"
  (deleteSuccess)="onDeleteSuccess($event)"
/>
```

## 输入属性 (Inputs)

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `eventId` | `string` | 必填 | 事件ID，用于关联上传的文件 |
| `multiple` | `boolean` | `true` | 是否支持多文件上传 |
| `maxCount` | `number` | `10` | 最大上传文件数量 |
| `maxSize` | `number` | `52428800` (50MB) | 单个文件最大大小（字节） |
| `accept` | `string` | `'.pdf,.doc,.docx,.xls,.xlsx,.txt'` | 接受的文件类型 |
| `disabled` | `boolean` | `false` | 是否禁用上传功能 |

## 输出事件 (Outputs)

| 事件 | 参数类型 | 描述 |
|------|----------|------|
| `uploadSuccess` | `Attachment` | 文件上传成功时触发 |
| `uploadError` | `Error` | 文件上传失败时触发 |
| `deleteSuccess` | `string` | 文件删除成功时触发，返回附件ID |

## 数据结构

### Attachment 接口

```typescript
interface Attachment {
  id: string;
  eventId: string;
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

## 文件类型图标

组件根据文件的MIME类型自动显示相应的图标：

- PDF: `picture_as_pdf`
- Word文档: `description`
- Excel表格: `table_chart`
- 文本文件: `text_snippet`
- 其他: `insert_drive_file`

## 样式定制

组件使用 TailwindCSS 构建，支持以下自定义：

- 通过修改 `.file-upload-container` 类调整整体容器样式
- 通过修改 `.upload-area` 类调整上传区域样式
- 通过修改 `.file-item` 类调整文件项样式
- 支持暗色模式自动切换

## 验证规则

组件内置以下验证：

1. 文件大小验证：检查文件是否超过 `maxSize`
2. 文件类型验证：检查文件扩展名是否在 `accept` 列表中
3. 文件数量验证：检查是否超过 `maxCount`

## 错误处理

组件会在以下情况触发 `uploadError` 事件：

- 文件超过大小限制
- 文件类型不支持
- 上传过程中网络错误
- 服务器返回错误

## 注意事项

1. 组件依赖 `@pro/sdk` 中的 `SkerSDK`，需要在 `app.config.ts` 中提供
2. 需要在应用中引入 Material Icons 字体支持图标显示
3. 组件使用 Angular Signals API，需要 Angular 16+ 版本
4. 文件上传使用 `@pro/sdk` 的 `AttachmentApi.uploadDocument` 方法

## 技术实现

- **框架**: Angular 20 (Standalone Component)
- **状态管理**: Angular Signals
- **样式**: TailwindCSS + SCSS
- **图标**: Material Icons
- **API**: @pro/sdk AttachmentApi
- **类型**: TypeScript 5.8

## 相关组件

- `ImageUploadComponent`: 专门用于图片上传
- `VideoUploadComponent`: 专门用于视频上传
