import { PageRequest } from './common.types.js';
import { EventType } from './event-type.types.js';
import { IndustryType } from './industry-type.types.js';
import { Tag } from './tag.types.js';
import { Attachment } from './attachment.types.js';

/**
 * 事件状态枚举
 */
export enum EventStatus {
  /** 草稿 */
  DRAFT = 0,
  /** 已发布 */
  PUBLISHED = 1,
  /** 已归档 */
  ARCHIVED = 2
}

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
 * 事件详情（含关联数据）
 */
export interface EventDetail extends Event {
  eventType?: EventType;
  industryType?: IndustryType;
  tags?: Tag[];
  attachments?: Attachment[];
}
