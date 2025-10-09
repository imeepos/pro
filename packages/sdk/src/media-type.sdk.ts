import { HttpClient } from './client/http-client';
import {
  MediaType,
  CreateMediaTypeDto,
  UpdateMediaTypeDto,
  QueryMediaTypeDto,
} from './media-type.interface';

/**
 * 媒体类型 SDK 接口
 */
export interface MediaTypeSdk {
  createMediaType(data: CreateMediaTypeDto): Promise<MediaType>;
  getMediaTypeList(query?: QueryMediaTypeDto): Promise<{ list: MediaType[]; total: number }>;
  getMediaTypeById(id: number): Promise<MediaType>;
  updateMediaType(id: number, data: UpdateMediaTypeDto): Promise<MediaType>;
  deleteMediaType(id: number): Promise<void>;
}

/**
 * 媒体类型 SDK 实现
 */
export class MediaTypeSdkImpl implements MediaTypeSdk {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 创建媒体类型
   */
  async createMediaType(data: CreateMediaTypeDto): Promise<MediaType> {
    return this.http.post<MediaType>('/api/media-type', data);
  }

  /**
   * 获取媒体类型列表
   */
  async getMediaTypeList(query?: QueryMediaTypeDto): Promise<{ list: MediaType[]; total: number }> {
    return this.http.get<{ list: MediaType[]; total: number }>('/api/media-type', query as Record<string, unknown>);
  }

  /**
   * 根据 ID 获取媒体类型
   */
  async getMediaTypeById(id: number): Promise<MediaType> {
    return this.http.get<MediaType>(`/api/media-type/${id}`);
  }

  /**
   * 更新媒体类型
   */
  async updateMediaType(id: number, data: UpdateMediaTypeDto): Promise<MediaType> {
    return this.http.put<MediaType>(`/api/media-type/${id}`, data);
  }

  /**
   * 删除媒体类型
   */
  async deleteMediaType(id: number): Promise<void> {
    return this.http.delete<void>(`/api/media-type/${id}`);
  }
}

/**
 * 创建媒体类型 SDK 实例
 */
export function createMediaTypeSdk(baseUrl: string): MediaTypeSdk {
  return new MediaTypeSdkImpl(baseUrl);
}
