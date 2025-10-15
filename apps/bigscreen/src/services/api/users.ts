/**
 * 用户相关API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, UserProfile } from '../../types';
import type { BaseQueryParams } from './types';

// 用户列表查询参数
export interface UsersListParams extends BaseQueryParams {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  sortBy?: 'username' | 'riskScore' | 'lastActive' | 'followerCount';
}

// 使用统一的 UserProfile 类型
export type UserInfo = UserProfile;

// 风险等级配置类型
export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  color: string;
  minScore: number;
  maxScore: number;
  actionRequired: boolean;
  autoActions: string[];
}

// 用户统计数据类型
export interface UserStatistics {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  monitoring: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  averageRiskScore: number;
  trends: {
    totalGrowthRate: number;
    riskScoreChange: number;
    newUsersGrowthRate: number;
  };
}

// 用户列表响应类型
export interface UsersListResponse {
  users: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export const UsersAPI = {
  // 获取用户列表
  getUsersList: async (params?: UsersListParams): Promise<UsersListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.riskLevel) queryParams.append('riskLevel', params.riskLevel);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const url = `/api/users/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<UsersListResponse>>(url);
    return response.data;
  },

  // 获取风险等级配置
  getRiskLevels: async (): Promise<RiskLevel[]> => {
    const response = await apiClient.get<ApiResponse<RiskLevel[]>>('/api/users/risk-levels');
    return response.data;
  },

  // 获取用户统计数据
  getStatistics: async (): Promise<UserStatistics> => {
    const response = await apiClient.get<ApiResponse<UserStatistics>>('/api/users/statistics');
    return response.data;
  },
};