import { HttpClient } from '../client/http-client.js';
import { Attachment, FileType, UploadOptions, SortData } from '../types/attachment.types.js';

/**
 * 附件 API 接口封装
 */
export class AttachmentApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 上传附件（带进度回调）
   */
  async uploadAttachment(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await this.http.upload<Attachment>(
        `/api/events/${eventId}/attachments`,
        formData,
        options?.onProgress
      );

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('上传失败');
      options?.onError?.(err);
      throw err;
    }
  }

  /**
   * 上传图片
   */
  async uploadImage(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.IMAGE);
    return this.uploadAttachment(eventId, file, options);
  }

  /**
   * 上传视频
   */
  async uploadVideo(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.VIDEO);
    return this.uploadAttachment(eventId, file, options);
  }

  /**
   * 上传文档
   */
  async uploadDocument(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.DOCUMENT);
    return this.uploadAttachment(eventId, file, options);
  }

  /**
   * 获取事件的所有附件
   */
  async getAttachments(eventId: number): Promise<Attachment[]> {
    return this.http.get<Attachment[]>(`/api/events/${eventId}/attachments`);
  }

  /**
   * 删除附件
   */
  async deleteAttachment(eventId: number, attachmentId: number): Promise<void> {
    return this.http.delete(`/api/events/${eventId}/attachments/${attachmentId}`);
  }

  /**
   * 更新附件排序
   */
  async updateSort(eventId: number, sortData: SortData[]): Promise<void> {
    return this.http.put(`/api/events/${eventId}/attachments/sort`, { attachments: sortData });
  }

  /**
   * 验证文件类型
   */
  private validateFileType(file: File, expectedType: FileType): void {
    const mimeType = file.type.toLowerCase();

    switch (expectedType) {
      case FileType.IMAGE:
        if (!mimeType.startsWith('image/')) {
          throw new Error('文件必须是图片格式');
        }
        break;
      case FileType.VIDEO:
        if (!mimeType.startsWith('video/')) {
          throw new Error('文件必须是视频格式');
        }
        break;
      case FileType.DOCUMENT:
        const docTypes = ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!docTypes.includes(mimeType)) {
          throw new Error('文件必须是文档格式（PDF、Word、Excel）');
        }
        break;
    }
  }
}
