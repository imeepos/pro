/**
 * 文件类型枚举
 */
export enum FileType {
  /** 图片 */
  IMAGE = 'image',
  /** 视频 */
  VIDEO = 'video',
  /** 文档 */
  DOCUMENT = 'document'
}

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
