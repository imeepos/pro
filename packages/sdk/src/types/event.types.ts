import { PageRequest } from './common.types.js';
import { EventType } from './event-type.types.js';
import { IndustryType } from './industry-type.types.js';
import { Tag } from './tag.types.js';
import { Attachment } from './attachment.types.js';
import { EventStatus } from '@pro/types';

// 重新导出类型守卫和转换函数
export { isValidEventStatus, numberToEventStatus, eventStatusToNumber } from '@pro/types';

/**
 * 事件实体
 */
export interface Event {
  id: string;
  eventTypeId: string;
  industryTypeId: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  locationText?: string;
  longitude?: number;
  latitude?: number;
  status: EventStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 地图展示所需的精简事件信息
 */
export interface EventMapPoint {
  id: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  longitude: number;
  latitude: number;
  status: EventStatus;
  eventTypeId: string;
  industryTypeId: string;
}

/**
 * 创建事件 DTO
 */
export interface CreateEventDto {
  eventTypeId: string;
  industryTypeId: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  locationText?: string;
  longitude?: number;
  latitude?: number;
  status?: EventStatus;
  tagIds?: string[];
}

/**
 * 更新事件 DTO
 */
export interface UpdateEventDto extends Partial<CreateEventDto> {
  id: string;
}

/**
 * 事件查询参数
 */
export interface EventQueryParams extends PageRequest {
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  city?: string;
  district?: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
  tagIds?: string[];
  keyword?: string;
}

/**
 * 地图数据查询参数
 */
export interface EventMapQueryParams {
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  city?: string;
  district?: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
  tagIds?: string[];
  keyword?: string;
}

/**
 * 事件详情（含关联数据）
 */
export interface EventDetail extends Event {
  eventType?: EventType;
  industryType?: IndustryType;
  tags?: Tag[];
  attachments?: Attachment[];
}
