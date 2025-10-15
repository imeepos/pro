/**
 * 统一API服务入口
 * 导出所有API模块和客户端
 */

// 导出基础API客户端
export { apiClient, apiUtils } from './client';

// 导出所有API模块
export { ChartsAPI } from './charts';
export * from './common';
export * from './events';
export * from './overview';
export * from './users';
export * from './system';
export * from './sentiment';
export * from './bleMesh';

// 导出类型
export type { ApiError, ExtendedAxiosError } from './client';
// 只导出 API 特有的类型
export type { TimeRange, PaginationParams, SortParams, BaseQueryParams, PaginatedResponse } from './types';