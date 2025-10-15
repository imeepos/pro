/**
 * 系统相关API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, SystemStatus as UnifiedSystemStatus } from '../../types';

// 使用统一的 SystemStatus 类型
export type SystemStatus = UnifiedSystemStatus;

// 服务状态类型
export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastCheck: string;
  dependencies: string[];
  errors?: string[];
}

// 性能指标类型
export interface SystemPerformance {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  network: {
    incoming: number;
    outgoing: number;
    connections: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  timestamp: string;
}

// 健康检查类型
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  checks: HealthCheckItem[];
  timestamp: string;
  responseTime: number;
}

// 健康检查项类型
export interface HealthCheckItem {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export const SystemAPI = {
  // 获取系统状态
  getStatus: async (): Promise<SystemStatus> => {
    const response = await apiClient.get<ApiResponse<SystemStatus>>('/api/system/status');
    return response.data;
  },

  // 获取性能指标
  getPerformance: async (): Promise<SystemPerformance> => {
    const response = await apiClient.get<ApiResponse<SystemPerformance>>('/api/system/performance');
    return response.data;
  },

  // 健康检查
  healthCheck: async (): Promise<HealthCheck> => {
    const response = await apiClient.get<ApiResponse<HealthCheck>>('/api/system/health');
    return response.data;
  },
};