import { FileType } from '@pro/types';

export { FileType };

/**
 * 附件实体
 */
export interface Attachment {
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

/**
 * 上传附件 DTO
 */
export interface UploadAttachmentDto {
  eventId: string;
  file: File;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 上传进度回调 (0-100) */
  onProgress?: (progress: number) => void;
  /** 上传成功回调 */
  onSuccess?: (response: Attachment) => void;
  /** 上传失败回调 */
  onError?: (error: Error) => void;
}

/**
 * 排序数据
 */
export interface SortData {
  /** 附件 ID */
  id: number;
  /** 排序顺序 */
  sortOrder: number;
}
