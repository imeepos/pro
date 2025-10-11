# VideoUploadComponent 视频上传组件

优雅的视频上传组件，支持拖拽上传、实时进度、视频预览等功能。

## 功能特性

- ✅ 点击上传和拖拽上传
- ✅ 实时上传进度（圆形进度条）
- ✅ 自动提取视频封面（第一帧）
- ✅ 显示视频时长和文件大小
- ✅ HTML5 视频播放器预览
- ✅ 优雅的错误处理
- ✅ 删除已上传视频
- ✅ 支持多视频上传
- ✅ 文件大小和类型验证
- ✅ 响应式设计
- ✅ 支持暗色模式

## 使用方法

### 基本用法

```typescript
import { Component } from '@angular/core';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [VideoUploadComponent],
  template: `
    <pro-video-upload
      [eventId]="eventId"
      [maxCount]="3"
      [maxSize]="500 * 1024 * 1024"
      (uploadSuccess)="onUploadSuccess($event)"
      (uploadError)="onUploadError($event)"
      (deleteSuccess)="onDeleteSuccess($event)"
    ></pro-video-upload>
  `
})
export class EventEditorComponent {
  eventId = '123';

  onUploadSuccess(attachment: Attachment): void {
    console.log('视频上传成功:', attachment);
  }

  onUploadError(error: Error): void {
    console.error('视频上传失败:', error);
  }

  onDeleteSuccess(attachmentId: string): void {
    console.log('视频删除成功:', attachmentId);
  }
}
```

### 单视频上传

```typescript
<pro-video-upload
  [eventId]="eventId"
  [multiple]="false"
  [maxCount]="1"
  (uploadSuccess)="onVideoUploaded($event)"
></pro-video-upload>
```

### 自定义配置

```typescript
<pro-video-upload
  [eventId]="eventId"
  [multiple]="true"
  [maxCount]="5"
  [maxSize]="1024 * 1024 * 1024"
  [accept]="'video/mp4,video/webm'"
  [disabled]="isUploading"
  (uploadSuccess)="handleSuccess($event)"
  (uploadError)="handleError($event)"
  (deleteSuccess)="handleDelete($event)"
></pro-video-upload>
```

## 输入属性 (Inputs)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `eventId` | `string` | **必需** | 事件 ID，用于上传视频 |
| `multiple` | `boolean` | `false` | 是否支持多视频上传 |
| `maxCount` | `number` | `3` | 最大上传视频数量 |
| `maxSize` | `number` | `500 * 1024 * 1024` | 单个文件最大大小（字节），默认 500MB |
| `accept` | `string` | `'video/*'` | 接受的视频类型 |
| `disabled` | `boolean` | `false` | 是否禁用上传 |

## 输出事件 (Outputs)

| 事件 | 参数类型 | 说明 |
|------|----------|------|
| `uploadSuccess` | `Attachment` | 视频上传成功时触发 |
| `uploadError` | `Error` | 视频上传失败时触发 |
| `deleteSuccess` | `string` | 视频删除成功时触发，参数为附件 ID |

## 视频状态

组件内部维护三种视频状态：

- `uploading` - 上传中，显示进度条
- `success` - 上传成功，显示视频播放器
- `error` - 上传失败，显示错误信息

## 样式定制

组件使用 Tailwind CSS，支持自定义主题：

```scss
// 自定义样式
.video-upload-container {
  // 覆盖默认样式
}
```

## 注意事项

1. **事件 ID 必需**：组件需要 `eventId` 才能上传视频
2. **大文件上传**：500MB 以上的视频上传可能需要较长时间
3. **浏览器兼容性**：需要支持 Canvas API 和 Blob URL
4. **内存管理**：组件会在销毁时自动清理所有 Blob URL
5. **视频格式**：建议使用 MP4、WebM 等现代浏览器支持的格式

## 技术实现

### 视频封面提取

使用 Canvas API 提取视频第一帧作为封面：

```typescript
private extractVideoCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}
```

### 视频时长获取

```typescript
private getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}
```

### 上传进度

使用 `AttachmentApi` 的 `onProgress` 回调获取实时进度：

```typescript
await this.attachmentApi.uploadVideo(eventId, file, {
  onProgress: (progress) => {
    video.progress = progress;
  },
  onSuccess: (attachment) => {
    console.log('上传成功', attachment);
  },
  onError: (error) => {
    console.error('上传失败', error);
  }
});
```

## 常见问题

### Q: 为什么视频上传很慢？

A: 视频文件通常较大，上传时间取决于文件大小和网络速度。组件会显示实时上传进度。

### Q: 支持哪些视频格式？

A: 默认支持所有视频格式（`video/*`），但建议使用 MP4、WebM 等现代浏览器支持的格式。

### Q: 如何限制视频格式？

A: 使用 `accept` 属性：
```html
<pro-video-upload accept="video/mp4,video/webm"></pro-video-upload>
```

### Q: 如何处理上传失败？

A: 监听 `uploadError` 事件并显示友好的错误提示：
```typescript
onUploadError(error: Error): void {
  this.toastService.error(`上传失败: ${error.message}`);
}
```

## 完整示例

```typescript
import { Component } from '@angular/core';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';
import { ToastService } from '@pro/admin/shared';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [VideoUploadComponent],
  template: `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold">上传活动视频</h3>

      <pro-video-upload
        [eventId]="eventId"
        [multiple]="true"
        [maxCount]="5"
        [maxSize]="500 * 1024 * 1024"
        [disabled]="isSubmitting"
        (uploadSuccess)="handleUploadSuccess($event)"
        (uploadError)="handleUploadError($event)"
        (deleteSuccess)="handleDeleteSuccess($event)"
      ></pro-video-upload>

      <p class="text-sm text-gray-500">
        已上传 {{ uploadedVideos.length }} 个视频
      </p>
    </div>
  `
})
export class EventFormComponent {
  eventId = '123';
  isSubmitting = false;
  uploadedVideos: Attachment[] = [];

  constructor(private toastService: ToastService) {}

  handleUploadSuccess(attachment: Attachment): void {
    this.uploadedVideos.push(attachment);
    this.toastService.success('视频上传成功');
  }

  handleUploadError(error: Error): void {
    this.toastService.error(`上传失败: ${error.message}`);
  }

  handleDeleteSuccess(attachmentId: string): void {
    this.uploadedVideos = this.uploadedVideos.filter(
      v => v.id !== attachmentId
    );
    this.toastService.success('视频删除成功');
  }
}
```

## 开发与维护

- **组件路径**: `apps/admin/src/app/shared/components/video-upload/`
- **类型定义**: `@pro/sdk` 提供的 `Attachment` 类型
- **API 服务**: `AttachmentApi` from `@pro/sdk`

## 更新日志

### v1.0.0 (2025-10-10)

- ✨ 初始版本发布
- ✅ 支持视频上传、预览、删除
- ✅ 自动提取封面和时长
- ✅ 响应式设计
- ✅ 暗色模式支持
