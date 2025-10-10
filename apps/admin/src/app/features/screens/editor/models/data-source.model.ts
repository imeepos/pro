import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { DataMode, DataSourceType, DataStatus, RequestMethod } from './data-source.enum';

export interface DataResponse<T = any> {
  status: DataStatus;
  data?: T;
  error?: string;
  timestamp?: number;
}

export interface DataAcceptor<T = any> {
  (response: DataResponse<T>): void;
}

export interface DataConfig {
  type: DataSourceType;
  mode: DataMode;
  options: Record<string, any>;
}

export interface StaticDataConfig extends DataConfig {
  type: DataSourceType.STATIC;
  data: any;
}

export interface ApiDataConfig extends DataConfig {
  type: DataSourceType.API;
  url: string;
  method: RequestMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  interval?: number;
}

export interface WebSocketDataConfig extends DataConfig {
  type: DataSourceType.WEBSOCKET;
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface GlobalDataConfig extends DataConfig {
  type: DataSourceType.GLOBAL;
  key: string;
}

export type AnyDataConfig = StaticDataConfig | ApiDataConfig | WebSocketDataConfig | GlobalDataConfig;

export interface DataInstance<T = any> {
  connect(acceptor: DataAcceptor<T>, options?: Record<string, any>): Promise<void> | void;
  disconnect?(): void;
  getRespData(options?: Record<string, any>): Promise<DataResponse<T>>;
  debug(acceptor: DataAcceptor<T>): Promise<void> | void;
}

export interface DataPlugin<T = any> {
  type: DataSourceType;
  name: string;
  component: Type<any>;
  handler: Type<DataInstance<T>>;
  useTo?: 'COMPONENT' | 'GLOBAL' | Array<'COMPONENT' | 'GLOBAL'>;
  getDefaultConfig?: () => Partial<DataConfig>;
}

export interface DataSlot {
  id: string;
  componentId: string;
  dataConfig: AnyDataConfig;
  data$: Observable<DataResponse>;
  status: DataStatus;
  lastUpdate?: number;
  error?: string;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: (value: any) => any;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface DataProcessing {
  fieldMappings?: FieldMapping[];
  filters?: DataFilter[];
  sort?: { field: string; order: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}
