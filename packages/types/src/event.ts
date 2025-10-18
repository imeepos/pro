export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * EventStatus类型守卫
 */
export function isValidEventStatus(value: string): value is EventStatus {
  return Object.values(EventStatus).includes(value as EventStatus);
}

/**
 * 数字到EventStatus的转换
 */
export function numberToEventStatus(value: number): EventStatus {
  switch (value) {
    case 0:
      return EventStatus.DRAFT;
    case 1:
      return EventStatus.PUBLISHED;
    case 2:
      return EventStatus.ARCHIVED;
    default:
      throw new Error(`Invalid EventStatus number: ${value}`);
  }
}

/**
 * EventStatus到数字的转换
 */
export function eventStatusToNumber(status: EventStatus): number {
  switch (status) {
    case EventStatus.DRAFT:
      return 0;
    case EventStatus.PUBLISHED:
      return 1;
    case EventStatus.ARCHIVED:
      return 2;
    default:
      throw new Error(`Unknown EventStatus: ${status}`);
  }
}

export interface EventSummary {
  id: string;
  eventTypeId: string;
  industryTypeId: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  status: EventStatus;
}

export interface EventMapPoint {
  id: string;
  eventName: string;
  summary?: string;
  occurTime: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  longitude: number;
  latitude: number;
  status: EventStatus;
  eventTypeId?: string;
  industryTypeId?: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface EventQueryParams extends PaginationInput {
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

export interface EventListResponse {
  items: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
}
