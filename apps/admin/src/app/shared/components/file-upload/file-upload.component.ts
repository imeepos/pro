import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkerSDK, Attachment } from '@pro/sdk';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  attachment?: Attachment;
  error?: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent {
  @Input() eventId!: string;
  @Input() multiple = true;
  @Input() maxCount = 10;
  @Input() maxSize = 50 * 1024 * 1024; // 50MB
  @Input() accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
  @Input() disabled = false;

  @Output() uploadSuccess = new EventEmitter<Attachment>();
  @Output() uploadError = new EventEmitter<Error>();
  @Output() deleteSuccess = new EventEmitter<string>();

  uploadingFiles = signal<UploadingFile[]>([]);
  isDragging = signal(false);

  private sdk = inject(SkerSDK);

  totalFiles = computed(() => this.uploadingFiles().length);
  successCount = computed(() =>
    this.uploadingFiles().filter(f => f.status === 'success').length
  );
  canUploadMore = computed(() => this.totalFiles() < this.maxCount);

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    if (this.disabled) return;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  private handleFiles(files: File[]): void {
    const remainingSlots = this.maxCount - this.totalFiles();
    const filesToUpload = files.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      if (!this.validateFile(file)) {
        continue;
      }
      this.uploadFile(file);
    }
  }

  private validateFile(file: File): boolean {
    if (file.size > this.maxSize) {
      const error = new Error(`文件 "${file.name}" 超过大小限制 ${this.formatFileSize(this.maxSize)}`);
      this.uploadError.emit(error);
      return false;
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = this.accept.split(',').map(t => t.trim().toLowerCase());

    if (!acceptedTypes.includes(extension)) {
      const error = new Error(`文件 "${file.name}" 类型不支持，仅支持: ${this.accept}`);
      this.uploadError.emit(error);
      return false;
    }

    return true;
  }

  private async uploadFile(file: File): Promise<void> {
    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      status: 'uploading'
    };

    this.uploadingFiles.update(files => [...files, uploadingFile]);

    try {
      const attachment = await this.sdk.attachment.uploadDocument(
        Number(this.eventId),
        file,
        {
          onProgress: (progress) => {
            this.updateFileProgress(file, progress);
          },
          onSuccess: (response) => {
            this.updateFileSuccess(file, response);
            this.uploadSuccess.emit(response);
          },
          onError: (error) => {
            this.updateFileError(file, error);
            this.uploadError.emit(error);
          }
        }
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error('上传失败');
      this.updateFileError(file, err);
      this.uploadError.emit(err);
    }
  }

  private updateFileProgress(file: File, progress: number): void {
    this.uploadingFiles.update(files =>
      files.map(f => f.file === file ? { ...f, progress } : f)
    );
  }

  private updateFileSuccess(file: File, attachment: Attachment): void {
    this.uploadingFiles.update(files =>
      files.map(f => f.file === file ? { ...f, status: 'success' as const, progress: 100, attachment } : f)
    );
  }

  private updateFileError(file: File, error: Error): void {
    this.uploadingFiles.update(files =>
      files.map(f => f.file === file ? { ...f, status: 'error' as const, error: error.message } : f)
    );
  }

  async deleteFile(uploadingFile: UploadingFile): Promise<void> {
    if (!uploadingFile.attachment) return;

    try {
      await this.sdk.attachment.deleteAttachment(
        Number(this.eventId),
        Number(uploadingFile.attachment.id)
      );

      this.uploadingFiles.update(files =>
        files.filter(f => f !== uploadingFile)
      );

      this.deleteSuccess.emit(uploadingFile.attachment.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('删除失败');
      this.uploadError.emit(err);
    }
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
    if (mimeType.includes('text')) return 'text_snippet';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getStatusIcon(status: UploadingFile['status']): string {
    switch (status) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'uploading': return 'cloud_upload';
      default: return 'insert_drive_file';
    }
  }

  getStatusColor(status: UploadingFile['status']): string {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }
}
