import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

export interface Attachment {
  id?: number;
  fileName: string;
  fileUrl: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  sortOrder: number;
  uploadProgress?: number;
  thumbnail?: string;
  file?: File;
}

@Component({
  selector: 'app-attachment-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- 上传区域 -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
        [class.border-blue-400]="isDragging"
        [class.bg-blue-50]="isDragging"
        [class.border-gray-300]="!isDragging"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <input
          #fileInput
          type="file"
          [multiple]="true"
          [accept]="acceptTypes"
          (change)="onFileSelect($event)"
          class="hidden"
        />

        <div class="flex flex-col items-center gap-3">
          <svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>
            <button
              type="button"
              (click)="fileInput.click()"
              class="text-blue-600 hover:text-blue-700 font-medium"
            >
              点击上传
            </button>
            <span class="text-gray-500"> 或拖拽文件到此处</span>
          </div>
          <p class="text-sm text-gray-500">
            支持图片、视频、文档，单个文件不超过 {{ maxFileSizeMB }}MB，最多 {{ maxFiles }} 个文件
          </p>
        </div>
      </div>

      <!-- 附件列表 -->
      <div *ngIf="attachments.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">
            已上传附件 ({{ attachments.length }}/{{ maxFiles }})
          </label>
          <button
            type="button"
            *ngIf="attachments.length > 1"
            class="text-sm text-gray-600 hover:text-gray-800"
          >
            排序模式
          </button>
        </div>

        <div class="space-y-2">
          <div
            *ngFor="let attachment of attachments; let i = index"
            class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <!-- 缩略图/图标 -->
            <div class="flex-shrink-0">
              <div
                *ngIf="attachment.fileType === 'image' && attachment.thumbnail"
                class="w-12 h-12 rounded overflow-hidden"
              >
                <img [src]="attachment.thumbnail" [alt]="attachment.fileName" class="w-full h-full object-cover" />
              </div>
              <div
                *ngIf="attachment.fileType !== 'image' || !attachment.thumbnail"
                class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center"
              >
                <svg *ngIf="attachment.fileType === 'video'" class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg *ngIf="attachment.fileType === 'document'" class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <!-- 文件信息 -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ attachment.fileName }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatFileSize(attachment.fileSize) }}
                <span *ngIf="attachment.uploadProgress !== undefined && attachment.uploadProgress < 100">
                  · 上传中 {{ attachment.uploadProgress }}%
                </span>
              </p>
              <!-- 上传进度条 -->
              <div
                *ngIf="attachment.uploadProgress !== undefined && attachment.uploadProgress < 100"
                class="w-full bg-gray-200 rounded-full h-1.5 mt-1"
              >
                <div
                  class="bg-blue-600 h-1.5 rounded-full transition-all"
                  [style.width.%]="attachment.uploadProgress"
                ></div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button
                type="button"
                *ngIf="i > 0"
                (click)="moveUp(i)"
                class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="上移"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                *ngIf="i < attachments.length - 1"
                (click)="moveDown(i)"
                class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="下移"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                (click)="removeAttachment(i)"
                class="p-1 text-red-400 hover:text-red-600 transition-colors"
                title="删除"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AttachmentUploaderComponent {
  @Input() attachments: Attachment[] = [];
  @Input() maxFiles = 20;
  @Input() maxFileSizeMB = 100;
  @Input() acceptTypes = 'image/*,video/*,.pdf,.doc,.docx';

  @Output() attachmentsChange = new EventEmitter<Attachment[]>();
  @Output() fileUpload = new EventEmitter<File>();

  isDragging = false;

  onDragOver(event: DragEvent): void {
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

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  handleFiles(files: File[]): void {
    if (this.attachments.length + files.length > this.maxFiles) {
      alert(`最多只能上传 ${this.maxFiles} 个文件`);
      return;
    }

    for (const file of files) {
      if (file.size > this.maxFileSizeMB * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 ${this.maxFileSizeMB}MB 限制`);
        continue;
      }

      const fileType = this.getFileType(file.type);
      const attachment: Attachment = {
        fileName: file.name,
        fileUrl: '',
        fileType,
        fileSize: file.size,
        mimeType: file.type,
        sortOrder: this.attachments.length,
        uploadProgress: 0,
        file
      };

      if (fileType === FileType.IMAGE) {
        this.generateThumbnail(file, attachment);
      }

      this.attachments = [...this.attachments, attachment];
      this.fileUpload.emit(file);
    }

    this.emitChange();
  }

  getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    }
    if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    }
    return FileType.DOCUMENT;
  }

  generateThumbnail(file: File, attachment: Attachment): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      attachment.thumbnail = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeAttachment(index: number): void {
    this.attachments = this.attachments.filter((_, i) => i !== index);
    this.updateSortOrder();
    this.emitChange();
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const temp = this.attachments[index];
    this.attachments[index] = this.attachments[index - 1];
    this.attachments[index - 1] = temp;
    this.attachments = [...this.attachments];
    this.updateSortOrder();
    this.emitChange();
  }

  moveDown(index: number): void {
    if (index === this.attachments.length - 1) return;
    const temp = this.attachments[index];
    this.attachments[index] = this.attachments[index + 1];
    this.attachments[index + 1] = temp;
    this.attachments = [...this.attachments];
    this.updateSortOrder();
    this.emitChange();
  }

  updateSortOrder(): void {
    this.attachments.forEach((attachment, index) => {
      attachment.sortOrder = index;
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  emitChange(): void {
    this.attachmentsChange.emit(this.attachments);
  }
}
