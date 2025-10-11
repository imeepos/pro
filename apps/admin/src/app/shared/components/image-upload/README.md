# ImageUploadComponent

优雅的图片上传组件，支持拖拽、进度显示和多图上传。

## 功能特性

- ✅ 点击选择文件上传
- ✅ 拖拽文件上传
- ✅ 实时上传进度显示
- ✅ 单图/多图上传模式
- ✅ 图片预览
- ✅ 删除图片
- ✅ 文件类型和大小验证
- ✅ 错误提示和重试机制
- ✅ 取消正在上传的文件
- ✅ 已上传图片管理
- ✅ 响应式设计

## 基本使用

### 1. 在组件中导入

```typescript
import { Component } from '@angular/core';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-your-component',
  standalone: true,
  imports: [ImageUploadComponent],
  template: `
    <app-image-upload
      [eventId]="eventId"
      [multiple]="true"
      [maxCount]="9"
      [existingImages]="images"
      (uploadSuccess)="onUploadSuccess($event)"
      (uploadError)="onUploadError($event)"
      (deleteSuccess)="onDeleteSuccess($event)"
    />
  `
})
export class YourComponent {
  eventId = '123';
  images: Attachment[] = [];

  onUploadSuccess(attachment: Attachment): void {
    console.log('上传成功:', attachment);
    this.images.push(attachment);
  }

  onUploadError(error: Error): void {
    console.error('上传失败:', error);
  }

  onDeleteSuccess(attachmentId: string): void {
    console.log('删除成功:', attachmentId);
    this.images = this.images.filter(img => img.id !== attachmentId);
  }
}
```

## 输入属性 (Inputs)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `eventId` | `string` | **必填** | 事件ID，用于关联上传的图片 |
| `multiple` | `boolean` | `false` | 是否支持多图上传 |
| `maxCount` | `number` | `9` | 最大上传数量 |
| `maxSize` | `number` | `10485760` (10MB) | 单个文件最大大小（字节） |
| `accept` | `string` | `'image/*'` | 接受的文件类型 |
| `disabled` | `boolean` | `false` | 是否禁用上传功能 |
| `existingImages` | `Attachment[]` | `[]` | 已存在的图片列表 |

## 输出事件 (Outputs)

| 事件 | 参数类型 | 说明 |
|------|----------|------|
| `uploadSuccess` | `Attachment` | 图片上传成功时触发 |
| `uploadError` | `Error` | 上传失败时触发 |
| `deleteSuccess` | `string` | 删除成功时触发，参数为附件ID |

## 使用场景

### 单图上传

```typescript
<app-image-upload
  [eventId]="eventId"
  [multiple]="false"
  (uploadSuccess)="onUploadSuccess($event)"
/>
```

### 多图上传（限制5张）

```typescript
<app-image-upload
  [eventId]="eventId"
  [multiple]="true"
  [maxCount]="5"
  [existingImages]="images"
  (uploadSuccess)="onUploadSuccess($event)"
  (deleteSuccess)="onDeleteSuccess($event)"
/>
```

### 自定义文件大小限制（5MB）

```typescript
<app-image-upload
  [eventId]="eventId"
  [maxSize]="5242880"
  (uploadSuccess)="onUploadSuccess($event)"
/>
```

### 禁用状态

```typescript
<app-image-upload
  [eventId]="eventId"
  [disabled]="true"
  [existingImages]="images"
/>
```

## 样式定制

组件使用 Tailwind CSS，可以通过覆盖 SCSS 变量或类来定制样式。

### 自定义上传区域样式

```scss
// 在你的组件样式文件中
::ng-deep app-image-upload {
  .upload-area {
    border-color: #your-color;
    background-color: #your-bg-color;
  }
}
```

## 完整示例

```typescript
import { Component, OnInit } from '@angular/core';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { SkerSDK, Attachment } from '@pro/sdk';
import { inject } from '@angular/core';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [ImageUploadComponent],
  template: `
    <div class="event-images">
      <h3>活动图片</h3>

      <app-image-upload
        [eventId]="eventId"
        [multiple]="true"
        [maxCount]="9"
        [maxSize]="10485760"
        [existingImages]="images"
        [disabled]="isReadOnly"
        (uploadSuccess)="handleUploadSuccess($event)"
        (uploadError)="handleUploadError($event)"
        (deleteSuccess)="handleDeleteSuccess($event)"
      />
    </div>
  `
})
export class EventDetailComponent implements OnInit {
  private sdk = inject(SkerSDK);

  eventId = '123';
  images: Attachment[] = [];
  isReadOnly = false;

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    try {
      this.images = await this.sdk.attachment.getAttachments(Number(this.eventId));
    } catch (error) {
      console.error('加载图片失败:', error);
    }
  }

  handleUploadSuccess(attachment: Attachment): void {
    this.images.push(attachment);
    console.log('图片上传成功，当前共有', this.images.length, '张图片');
  }

  handleUploadError(error: Error): void {
    console.error('上传失败:', error.message);
    // 可以在这里显示 toast 提示
  }

  handleDeleteSuccess(attachmentId: string): void {
    this.images = this.images.filter(img => img.id !== attachmentId);
    console.log('图片删除成功，剩余', this.images.length, '张图片');
  }
}
```

## 注意事项

1. **eventId 必填**: 组件需要 eventId 来标识图片所属的事件
2. **已存在图片管理**: 需要在父组件中维护 `existingImages` 数组，并在上传成功/删除成功后更新
3. **错误处理**: 建议监听 `uploadError` 事件，向用户展示友好的错误提示
4. **文件大小**: 默认限制 10MB，可通过 `maxSize` 属性调整
5. **类型检查**: 组件只接受图片文件（image/*）

## 技术实现

- 使用 `XMLHttpRequest` 实现带进度的文件上传
- 集成 `@pro/sdk` 的 `AttachmentApi`
- 采用 Angular Standalone Component 架构
- 使用 Tailwind CSS 实现响应式布局
- 支持 `AbortController` 取消上传

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 不支持 IE11
