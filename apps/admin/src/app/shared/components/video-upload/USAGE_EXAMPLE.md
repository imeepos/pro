# VideoUploadComponent 使用示例

## 场景一：活动编辑器中上传视频

```typescript
// event-editor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';
import { ToastService } from '@pro/admin/shared';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [CommonModule, VideoUploadComponent],
  template: `
    <div class="event-editor">
      <div class="form-section">
        <label class="form-label">活动视频</label>
        <p class="form-hint">上传活动相关的视频，最多 3 个</p>

        <pro-video-upload
          [eventId]="eventId"
          [multiple]="true"
          [maxCount]="3"
          [maxSize]="500 * 1024 * 1024"
          [disabled]="isSaving"
          (uploadSuccess)="onVideoUploaded($event)"
          (uploadError)="onUploadError($event)"
          (deleteSuccess)="onVideoDeleted($event)"
        ></pro-video-upload>
      </div>

      <div class="form-actions">
        <button
          type="button"
          (click)="saveEvent()"
          [disabled]="isSaving || isUploading"
          class="btn btn-primary"
        >
          {{ isSaving ? '保存中...' : '保存活动' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .event-editor {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2rem;
    }

    .form-label {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #374151;
    }

    .form-hint {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      transition: all 0.15s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class EventEditorComponent implements OnInit {
  eventId = '';
  isSaving = false;
  isUploading = false;
  uploadedVideos: Attachment[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    // 从路由获取事件 ID
    this.eventId = '123'; // 实际项目中从路由参数获取
  }

  onVideoUploaded(attachment: Attachment): void {
    this.uploadedVideos.push(attachment);
    this.isUploading = false;
    this.toastService.success(`视频 "${attachment.fileName}" 上传成功`);
  }

  onUploadError(error: Error): void {
    this.isUploading = false;
    this.toastService.error(`视频上传失败: ${error.message}`);
  }

  onVideoDeleted(attachmentId: string): void {
    this.uploadedVideos = this.uploadedVideos.filter(
      video => video.id !== attachmentId
    );
    this.toastService.success('视频已删除');
  }

  async saveEvent(): Promise<void> {
    if (this.isUploading) {
      this.toastService.warning('请等待视频上传完成');
      return;
    }

    this.isSaving = true;
    try {
      // 保存活动逻辑
      console.log('保存活动，包含视频:', this.uploadedVideos);
      this.toastService.success('活动保存成功');
    } catch (error) {
      this.toastService.error('活动保存失败');
    } finally {
      this.isSaving = false;
    }
  }
}
```

## 场景二：单视频上传（活动封面视频）

```typescript
// event-cover-video.component.ts
import { Component } from '@angular/core';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-event-cover-video',
  standalone: true,
  imports: [VideoUploadComponent],
  template: `
    <div class="cover-video-section">
      <h3>活动封面视频</h3>
      <p class="hint">上传一个精彩的封面视频，吸引参与者</p>

      <pro-video-upload
        [eventId]="eventId"
        [multiple]="false"
        [maxCount]="1"
        [maxSize]="100 * 1024 * 1024"
        [accept]="'video/mp4,video/webm'"
        (uploadSuccess)="onCoverVideoUploaded($event)"
        (uploadError)="onError($event)"
      ></pro-video-upload>

      <div *ngIf="coverVideo" class="video-info">
        <p>已上传封面视频: {{ coverVideo.fileName }}</p>
        <p>文件大小: {{ formatFileSize(coverVideo.fileSize) }}</p>
      </div>
    </div>
  `
})
export class EventCoverVideoComponent {
  eventId = '123';
  coverVideo?: Attachment;

  onCoverVideoUploaded(attachment: Attachment): void {
    this.coverVideo = attachment;
    console.log('封面视频已上传:', attachment);
  }

  onError(error: Error): void {
    console.error('上传失败:', error);
  }

  formatFileSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
```

## 场景三：带状态管理的视频上传

```typescript
// event-video-manager.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';

interface VideoState {
  attachment: Attachment;
  status: 'uploaded' | 'processing' | 'ready';
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-event-video-manager',
  standalone: true,
  imports: [CommonModule, VideoUploadComponent],
  template: `
    <div class="video-manager">
      <div class="header">
        <h2>视频管理</h2>
        <div class="stats">
          <span>已上传: {{ videos.length }} / {{ maxVideos }}</span>
          <span>总大小: {{ totalSize | fileSize }}</span>
        </div>
      </div>

      <!-- 上传区域 -->
      <pro-video-upload
        [eventId]="eventId"
        [multiple]="true"
        [maxCount]="maxVideos"
        [maxSize]="maxVideoSize"
        [disabled]="videos.length >= maxVideos"
        (uploadSuccess)="handleUploadSuccess($event)"
        (uploadError)="handleUploadError($event)"
        (deleteSuccess)="handleDeleteSuccess($event)"
      ></pro-video-upload>

      <!-- 视频列表 -->
      <div *ngIf="videos.length > 0" class="video-list">
        <h3>已上传的视频</h3>
        <div class="video-grid">
          <div *ngFor="let video of videos; let i = index" class="video-card">
            <div class="video-preview">
              <video [src]="video.attachment.fileUrl" controls></video>
            </div>
            <div class="video-details">
              <p class="video-name">{{ video.attachment.fileName }}</p>
              <p class="video-size">
                {{ video.attachment.fileSize | fileSize }}
              </p>
              <span
                class="status-badge"
                [class.uploaded]="video.status === 'uploaded'"
                [class.processing]="video.status === 'processing'"
                [class.ready]="video.status === 'ready'"
              >
                {{ getStatusText(video.status) }}
              </span>
            </div>
            <button
              class="delete-btn"
              (click)="deleteVideo(video)"
              type="button"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div *ngIf="videos.length === 0" class="empty-state">
        <p>还没有上传任何视频</p>
      </div>
    </div>
  `
})
export class EventVideoManagerComponent implements OnInit {
  eventId = '';
  maxVideos = 5;
  maxVideoSize = 500 * 1024 * 1024; // 500MB
  videos: VideoState[] = [];

  get totalSize(): number {
    return this.videos.reduce(
      (sum, v) => sum + v.attachment.fileSize,
      0
    );
  }

  ngOnInit(): void {
    this.loadExistingVideos();
  }

  async loadExistingVideos(): Promise<void> {
    // 从 API 加载已存在的视频
    // const attachments = await this.attachmentApi.getAttachments(this.eventId);
    // this.videos = attachments.map(a => ({
    //   attachment: a,
    //   status: 'ready'
    // }));
  }

  handleUploadSuccess(attachment: Attachment): void {
    this.videos.push({
      attachment,
      status: 'uploaded'
    });

    // 可以在这里触发后台处理
    this.processVideo(attachment.id);
  }

  handleUploadError(error: Error): void {
    console.error('上传错误:', error);
  }

  handleDeleteSuccess(attachmentId: string): void {
    this.videos = this.videos.filter(
      v => v.attachment.id !== attachmentId
    );
  }

  async processVideo(videoId: string): Promise<void> {
    const video = this.videos.find(v => v.attachment.id === videoId);
    if (!video) return;

    video.status = 'processing';

    // 模拟视频处理（实际项目中调用后台 API）
    setTimeout(() => {
      video.status = 'ready';
    }, 3000);
  }

  async deleteVideo(video: VideoState): Promise<void> {
    if (confirm(`确定要删除视频 "${video.attachment.fileName}" 吗？`)) {
      // 删除逻辑由组件内部处理
      // 这里只是示例，实际不需要手动调用
    }
  }

  getStatusText(status: VideoState['status']): string {
    const statusMap = {
      uploaded: '已上传',
      processing: '处理中',
      ready: '就绪'
    };
    return statusMap[status] || status;
  }
}

// 自定义管道
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
```

## 场景四：结合表单使用

```typescript
// event-form.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, VideoUploadComponent],
  template: `
    <form [formGroup]="eventForm" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label>活动名称</label>
        <input
          type="text"
          formControlName="name"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>活动描述</label>
        <textarea
          formControlName="description"
          class="form-control"
          rows="4"
        ></textarea>
      </div>

      <div class="form-group">
        <label>活动视频</label>
        <pro-video-upload
          [eventId]="eventId"
          [multiple]="true"
          [maxCount]="3"
          (uploadSuccess)="onVideoUploaded($event)"
          (deleteSuccess)="onVideoDeleted($event)"
        ></pro-video-upload>
      </div>

      <button
        type="submit"
        [disabled]="eventForm.invalid || isSubmitting"
        class="btn btn-primary"
      >
        提交
      </button>
    </form>
  `
})
export class EventFormComponent {
  eventId = '123';
  eventForm: FormGroup;
  isSubmitting = false;
  videoAttachments: Attachment[] = [];

  constructor(private fb: FormBuilder) {
    this.eventForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  onVideoUploaded(attachment: Attachment): void {
    this.videoAttachments.push(attachment);
  }

  onVideoDeleted(attachmentId: string): void {
    this.videoAttachments = this.videoAttachments.filter(
      v => v.id !== attachmentId
    );
  }

  async onSubmit(): Promise<void> {
    if (this.eventForm.invalid) return;

    this.isSubmitting = true;
    try {
      const formData = {
        ...this.eventForm.value,
        videoIds: this.videoAttachments.map(v => v.id)
      };

      console.log('提交表单:', formData);
      // 调用 API 保存
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      this.isSubmitting = false;
    }
  }
}
```

## 场景五：自定义错误处理

```typescript
// advanced-video-upload.component.ts
import { Component } from '@angular/core';
import { VideoUploadComponent } from '@pro/admin/shared';
import { Attachment } from '@pro/sdk';
import { ToastService } from '@pro/admin/shared';

@Component({
  selector: 'app-advanced-video-upload',
  standalone: true,
  imports: [VideoUploadComponent],
  template: `
    <pro-video-upload
      [eventId]="eventId"
      [maxCount]="5"
      [maxSize]="maxSize"
      (uploadSuccess)="handleSuccess($event)"
      (uploadError)="handleError($event)"
    ></pro-video-upload>
  `
})
export class AdvancedVideoUploadComponent {
  eventId = '123';
  maxSize = 500 * 1024 * 1024;

  constructor(private toastService: ToastService) {}

  handleSuccess(attachment: Attachment): void {
    this.toastService.success(
      `视频 "${attachment.fileName}" 上传成功`,
      {
        duration: 3000,
        position: 'top-right'
      }
    );

    // 记录分析
    this.trackVideoUpload(attachment);
  }

  handleError(error: Error): void {
    // 根据错误类型显示不同的提示
    if (error.message.includes('网络')) {
      this.toastService.error('网络连接失败，请检查网络后重试');
    } else if (error.message.includes('大小')) {
      this.toastService.error(
        `文件过大，最大支持 ${this.maxSize / (1024 * 1024)}MB`
      );
    } else if (error.message.includes('格式')) {
      this.toastService.error('不支持的视频格式');
    } else {
      this.toastService.error(`上传失败: ${error.message}`);
    }

    // 记录错误日志
    this.logError(error);
  }

  private trackVideoUpload(attachment: Attachment): void {
    // 发送分析数据
    console.log('Track upload:', {
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType
    });
  }

  private logError(error: Error): void {
    // 记录错误到监控系统
    console.error('Video upload error:', error);
  }
}
```

## 最佳实践

1. **总是提供 eventId**：确保组件能正常上传视频
2. **合理设置大小限制**：根据服务器和网络情况设置
3. **监听错误事件**：提供友好的错误提示
4. **管理上传状态**：在表单提交时检查上传是否完成
5. **清理资源**：组件会自动清理 Blob URL，无需手动处理

## 性能优化

1. **限制视频数量**：避免同时上传过多视频
2. **压缩视频**：建议在上传前对视频进行压缩
3. **分片上传**：对于大文件，考虑使用分片上传
4. **懒加载**：只在需要时加载组件
