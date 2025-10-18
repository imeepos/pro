export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface User {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UserProfile {
  userId: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}


export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 导出统一的枚举定义
export * from './enums/weibo.js';
export * from './enums/file.js';
export * from './enums/common.js';

// 导出接口定义（从接口文件中重新导出枚举，保持向后兼容）
export * from './weibo-search-task.js';
export * from './weibo-account.js';
export * from './api-key.js';
export * from './bug.js';
export * from './event.js';
export * from './screen.js';
export * from './auth.js';
export * from './config.js';
export * from './raw-data.js';
