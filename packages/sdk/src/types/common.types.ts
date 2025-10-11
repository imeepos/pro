/**
 * 分页请求参数
 */
export interface PageRequest {
  page: number;
  pageSize: number;
}

/**
 * 分页响应
 */
export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * SDK API 响应包装
 */
export interface SdkApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
