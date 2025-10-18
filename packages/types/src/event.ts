import { EventStatus } from './enums/event.js';

export * from './enums/event.js';

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
