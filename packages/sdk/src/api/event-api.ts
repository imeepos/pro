import { HttpClient } from '../client/http-client';
import {
  Event,
  EventDetail,
  CreateEventDto,
  UpdateEventDto,
  EventQueryParams,
} from '../types/event.types';
import { PageResponse } from '../types/common.types';

interface EventListPayload {
  items: Event[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

/**
 * 事件 API 接口封装
 */
export class EventApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 查询事件列表
   */
  async getEvents(params: EventQueryParams): Promise<PageResponse<Event>> {
    const response = await this.http.get<EventListPayload>(
      '/api/events',
      params as unknown as Record<string, unknown>
    );

    return {
      data: response.items,
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
      totalPages: response.totalPages,
    };
  }

  /**
   * 获取事件详情
   */
  async getEventById(id: string): Promise<EventDetail> {
    return this.http.get<EventDetail>(`/api/events/${id}`);
  }

  /**
   * 创建事件
   */
  async createEvent(dto: CreateEventDto): Promise<Event> {
    return this.http.post<Event>('/api/events', dto);
  }

  /**
   * 更新事件
   */
  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}`, dto);
  }

  /**
   * 删除事件
   */
  async deleteEvent(id: string): Promise<void> {
    return this.http.delete(`/api/events/${id}`);
  }

  /**
   * 发布事件
   */
  async publishEvent(id: string): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}/publish`, {});
  }

  /**
   * 归档事件
   */
  async archiveEvent(id: string): Promise<Event> {
    return this.http.put<Event>(`/api/events/${id}/archive`, {});
  }

  /**
   * 查询附近事件
   */
  async getNearbyEvents(
    longitude: number,
    latitude: number,
    radius: number
  ): Promise<Event[]> {
    return this.http.get<Event[]>('/api/events/nearby', {
      longitude,
      latitude,
      radius,
    });
  }

  /**
   * 按标签查询事件
   */
  async getEventsByTag(tagId: string): Promise<Event[]> {
    return this.http.get<Event[]>(`/api/events/by-tag/${tagId}`);
  }

  /**
   * 为事件添加标签
   */
  async addTagsToEvent(eventId: string, tagIds: string[]): Promise<void> {
    return this.http.post(`/api/events/${eventId}/tags`, { tagIds });
  }

  /**
   * 移除事件标签
   */
  async removeTagFromEvent(eventId: string, tagId: string): Promise<void> {
    return this.http.delete(`/api/events/${eventId}/tags/${tagId}`);
  }
}
