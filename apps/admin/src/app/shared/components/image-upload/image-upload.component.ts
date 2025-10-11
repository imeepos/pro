import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkerSDK } from '@pro/sdk';
import { Attachment } from '@pro/sdk';
import { environment } from '../../../../environments/environment';

interface UploadingImage {
  file: File;
  progress: number;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  attachment?: Attachment;
  error?: string;
  abortController?: AbortController;
}

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss']
})
export class ImageUploadComponent implements OnDestroy {
  private readonly sdk = inject(SkerSDK);

  @Input() eventId!: string;
  @Input() multiple = false;
  @Input() maxCount = 9;
  @Input() maxSize = 10 * 1024 * 1024;
  @Input() accept = 'image/*';
  @Input() disabled = false;
  @Input() existingImages: Attachment[] = [];

  @Output() uploadSuccess = new EventEmitter<Attachment>();
  @Output() uploadError = new EventEmitter<Error>();
  @Output() deleteSuccess = new EventEmitter<string>();

  uploadingImages: UploadingImage[] = [];
  isDragging = false;

  get canUploadMore(): boolean {
    const totalCount = this.existingImages.length + this.uploadingImages.filter(img => img.status === 'success').length;
    return totalCount < this.maxCount && !this.disabled;
  }

  get remainingSlots(): number {
    const totalCount = this.existingImages.length + this.uploadingImages.filter(img => img.status === 'success').length;
    return Math.max(0, this.maxCount - totalCount);
  }

  ngOnDestroy(): void {
    this.uploadingImages.forEach(img => {
      if (img.abortController) {
        img.abortController.abort();
      }
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) {
      this.isDragging = true;
    }
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
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  private handleFiles(files: File[]): void {
    if (!this.canUploadMore) {
      this.uploadError.emit(new Error(`最多只能上传 ${this.maxCount} 张图片`));
      return;
    }

    const validFiles = files.filter(file => this.validateFile(file));
    const filesToUpload = this.multiple
      ? validFiles.slice(0, this.remainingSlots)
      : validFiles.slice(0, 1);

    filesToUpload.forEach(file => this.uploadFile(file));
  }

  private validateFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      this.uploadError.emit(new Error(`${file.name} 不是图片文件`));
      return false;
    }

    if (file.size > this.maxSize) {
      const maxSizeMB = (this.maxSize / (1024 * 1024)).toFixed(1);
      this.uploadError.emit(new Error(`${file.name} 超过最大文件大小 ${maxSizeMB}MB`));
      return false;
    }

    return true;
  }

  private async uploadFile(file: File): Promise<void> {
    const preview = URL.createObjectURL(file);
    const abortController = new AbortController();

    const uploadingImage: UploadingImage = {
      file,
      progress: 0,
      preview,
      status: 'uploading',
      abortController
    };

    this.uploadingImages.push(uploadingImage);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadingImage.progress = Math.round((event.loaded / event.total) * 100);
        }
      });

      const uploadPromise = new Promise<Attachment>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error(`上传失败: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('网络错误'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('上传已取消'));
        });

        xhr.open('POST', `${environment.apiUrl}/events/${this.eventId}/attachments`);

        const token = localStorage.getItem('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });

      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      const attachment = await uploadPromise;

      uploadingImage.status = 'success';
      uploadingImage.attachment = attachment;
      uploadingImage.progress = 100;

      this.uploadSuccess.emit(attachment);
    } catch (error) {
      uploadingImage.status = 'error';
      uploadingImage.error = error instanceof Error ? error.message : '上传失败';

      this.uploadError.emit(error instanceof Error ? error : new Error('上传失败'));
    }
  }

  async deleteImage(image: UploadingImage): Promise<void> {
    if (image.status === 'uploading' && image.abortController) {
      image.abortController.abort();
      this.removeUploadingImage(image);
      return;
    }

    if (image.status === 'error') {
      this.removeUploadingImage(image);
      return;
    }

    if (image.status === 'success' && image.attachment) {
      try {
        await this.sdk.attachment.deleteAttachment(
          Number(this.eventId),
          Number(image.attachment.id)
        );

        this.deleteSuccess.emit(image.attachment.id);
        this.removeUploadingImage(image);
      } catch (error) {
        this.uploadError.emit(error instanceof Error ? error : new Error('删除失败'));
      }
    }
  }

  async deleteExistingImage(attachment: Attachment): Promise<void> {
    if (this.disabled) return;

    try {
      await this.sdk.attachment.deleteAttachment(
        Number(this.eventId),
        Number(attachment.id)
      );

      this.deleteSuccess.emit(attachment.id);
    } catch (error) {
      this.uploadError.emit(error instanceof Error ? error : new Error('删除失败'));
    }
  }

  private removeUploadingImage(image: UploadingImage): void {
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }

    const index = this.uploadingImages.indexOf(image);
    if (index > -1) {
      this.uploadingImages.splice(index, 1);
    }
  }

  retryUpload(image: UploadingImage): void {
    if (image.status === 'error') {
      this.removeUploadingImage(image);
      this.uploadFile(image.file);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
