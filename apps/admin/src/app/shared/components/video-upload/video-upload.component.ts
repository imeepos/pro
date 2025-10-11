import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment, FileType } from '@pro/sdk';
import { AttachmentApi } from '@pro/sdk';
import { Subject, takeUntil } from 'rxjs';

interface UploadingVideo {
  file: File;
  progress: number;
  previewUrl: string;
  coverUrl?: string;
  duration?: number;
  status: 'uploading' | 'success' | 'error';
  attachment?: Attachment;
  error?: string;
}

@Component({
  selector: 'pro-video-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.scss']
})
export class VideoUploadComponent implements OnDestroy {
  @Input() eventId!: string;
  @Input() multiple = false;
  @Input() maxCount = 3;
  @Input() maxSize = 500 * 1024 * 1024;
  @Input() accept = 'video/*';
  @Input() disabled = false;

  @Output() uploadSuccess = new EventEmitter<Attachment>();
  @Output() uploadError = new EventEmitter<Error>();
  @Output() deleteSuccess = new EventEmitter<string>();

  uploadingVideos: UploadingVideo[] = [];
  isDragging = false;

  private destroy$ = new Subject<void>();
  private attachmentApi!: AttachmentApi;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeAllUrls();
  }

  onDragOver(event: DragEvent): void {
    if (this.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (this.disabled) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelect(event: Event): void {
    if (this.disabled) return;

    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  async handleFiles(files: File[]): Promise<void> {
    const validVideos = files.filter(file => this.validateFile(file));

    if (validVideos.length === 0) return;

    const remainingSlots = this.maxCount - this.uploadingVideos.length;
    if (validVideos.length > remainingSlots) {
      this.showError(new Error(`最多只能上传 ${this.maxCount} 个视频，当前还可上传 ${remainingSlots} 个`));
      return;
    }

    for (const file of validVideos) {
      await this.processVideo(file);
    }
  }

  private validateFile(file: File): boolean {
    if (!file.type.startsWith('video/')) {
      this.showError(new Error(`文件 ${file.name} 不是视频格式`));
      return false;
    }

    if (file.size > this.maxSize) {
      const sizeMB = Math.round(this.maxSize / (1024 * 1024));
      this.showError(new Error(`文件 ${file.name} 超过 ${sizeMB}MB 限制`));
      return false;
    }

    return true;
  }

  private async processVideo(file: File): Promise<void> {
    const previewUrl = URL.createObjectURL(file);

    const uploadingVideo: UploadingVideo = {
      file,
      progress: 0,
      previewUrl,
      status: 'uploading'
    };

    this.uploadingVideos = [...this.uploadingVideos, uploadingVideo];

    try {
      const coverUrl = await this.extractVideoCover(file);
      uploadingVideo.coverUrl = coverUrl;

      const duration = await this.getVideoDuration(file);
      uploadingVideo.duration = duration;
    } catch (error) {
      console.warn('提取视频信息失败', error);
    }

    await this.uploadVideo(uploadingVideo);
  }

  private async uploadVideo(video: UploadingVideo): Promise<void> {
    if (!this.eventId) {
      video.status = 'error';
      video.error = '事件 ID 不能为空';
      this.showError(new Error(video.error));
      return;
    }

    if (!this.attachmentApi) {
      const baseUrl = this.getApiBaseUrl();
      this.attachmentApi = new AttachmentApi(baseUrl);
    }

    try {
      const attachment = await this.attachmentApi.uploadVideo(
        Number(this.eventId),
        video.file,
        {
          onProgress: (progress) => {
            video.progress = progress;
            this.updateVideoList();
          },
          onSuccess: (response) => {
            video.status = 'success';
            video.attachment = response;
            video.progress = 100;
            this.updateVideoList();
            this.uploadSuccess.emit(response);
          },
          onError: (error) => {
            video.status = 'error';
            video.error = error.message;
            this.updateVideoList();
            this.uploadError.emit(error);
          }
        }
      );
    } catch (error) {
      video.status = 'error';
      video.error = error instanceof Error ? error.message : '上传失败';
      this.updateVideoList();
      this.uploadError.emit(error instanceof Error ? error : new Error('上传失败'));
    }
  }

  async deleteVideo(video: UploadingVideo): Promise<void> {
    if (!video.attachment?.id) {
      this.removeVideoFromList(video);
      return;
    }

    try {
      await this.attachmentApi.deleteAttachment(
        Number(this.eventId),
        Number(video.attachment.id)
      );

      this.removeVideoFromList(video);
      this.deleteSuccess.emit(video.attachment.id);
    } catch (error) {
      this.showError(error instanceof Error ? error : new Error('删除失败'));
    }
  }

  private removeVideoFromList(video: UploadingVideo): void {
    URL.revokeObjectURL(video.previewUrl);
    if (video.coverUrl && video.coverUrl.startsWith('blob:')) {
      URL.revokeObjectURL(video.coverUrl);
    }
    this.uploadingVideos = this.uploadingVideos.filter(v => v !== video);
  }

  private extractVideoCover(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }

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

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('视频加载失败'));
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
  }

  private getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');

      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法获取视频时长'));
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (Math.round(bytes / Math.pow(k, i) * 100) / 100) + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private updateVideoList(): void {
    this.uploadingVideos = [...this.uploadingVideos];
  }

  private revokeAllUrls(): void {
    this.uploadingVideos.forEach(video => {
      URL.revokeObjectURL(video.previewUrl);
      if (video.coverUrl && video.coverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(video.coverUrl);
      }
    });
  }

  private showError(error: Error): void {
    console.error('视频上传错误:', error);
    this.uploadError.emit(error);
  }

  private getApiBaseUrl(): string {
    return window.location.origin;
  }

  trackByVideo(index: number, video: UploadingVideo): string {
    return video.file.name + video.file.size;
  }
}
