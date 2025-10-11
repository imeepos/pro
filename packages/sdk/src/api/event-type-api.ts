import { HttpClient } from '../client/http-client.js';
import {
  EventType,
  CreateEventTypeDto,
  UpdateEventTypeDto,
} from '../types/event-type.types.js';

/**
 * 事件类型 API 接口封装
 */
export class EventTypeApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 查询事件类型列表
   */
  async getEventTypes(): Promise<EventType[]> {
    return this.http.get<EventType[]>('/api/event-types');
  }

  /**
   * 获取事件类型详情
   */
  async getEventTypeById(id: number): Promise<EventType> {
    return this.http.get<EventType>(`/api/event-types/${id}`);
  }

  
  /**
   * 创建事件类型
   */
  async createEventType(dto: CreateEventTypeDto): Promise<EventType> {
    return this.http.post<EventType>('/api/event-types', dto);
  }

  /**
   * 更新事件类型
   */
  async updateEventType(id: number, dto: UpdateEventTypeDto): Promise<EventType> {
    return this.http.put<EventType>(`/api/event-types/${id}`, dto);
  }

  /**
   * 删除事件类型
   */
  async deleteEventType(id: number): Promise<void> {
    return this.http.delete(`/api/event-types/${id}`);
  }
}
