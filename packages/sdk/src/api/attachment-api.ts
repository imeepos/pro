import { HttpClient } from '../client/http-client';
import { Attachment } from '../types/attachment.types';

/**
 * 附件 API 接口封装
 */
export class AttachmentApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 上传附件
   */
  async uploadAttachment(eventId: number, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`/api/events/${eventId}/attachments`, formData);
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
   * 批量更新附件排序
   */
  async updateAttachmentsSort(
    eventId: number,
    attachments: { id: number; sortOrder: number }[]
  ): Promise<void> {
    return this.http.put(`/api/events/${eventId}/attachments/sort`, { attachments });
  }
}
