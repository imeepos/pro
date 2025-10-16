import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LoggedInUsersStats,
  EventQueryParams,
  EventMapQueryParams,
  EventSummary,
  EventMapPoint,
  TokenStorage
} from '@pro/types';

export interface WeiboStatsDataSource {
  fetchLoggedInUsers(): Observable<LoggedInUsersStats>;
}

export interface EventDataSource {
  fetchEvents(params: EventQueryParams): Promise<EventSummary[]>;
  fetchEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]>;
  fetchAmapApiKey(): Promise<string | null>;
}

export const WEIBO_STATS_DATA_SOURCE = new InjectionToken<WeiboStatsDataSource>('WEIBO_STATS_DATA_SOURCE');

export const EVENT_DATA_SOURCE = new InjectionToken<EventDataSource>('EVENT_DATA_SOURCE');

export const TOKEN_STORAGE = new InjectionToken<TokenStorage>('TOKEN_STORAGE');
