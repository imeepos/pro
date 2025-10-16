import { Request } from 'express';

// 扩展 Request 类型以包含 apiKey 属性
declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
    }
  }
}

/**
 * 认证类型枚举
 */
export enum AuthType {
  JWT = 'jwt',
  API_KEY = 'api_key',
  NONE = 'none'
}

/**
 * 认证信息接口
 */
export interface AuthInfo {
  type: AuthType;
  userId: string;
  username: string;
  email: string;
  authMethod: string;
  permissions?: string[];
}

/**
 * 认证工具类
 */
export class AuthUtils {
  /**
   * 从请求中提取认证信息
   */
  static extractAuthInfo(request: Request): AuthInfo | null {
    const user = request.user as any;
    if (!user) {
      return null;
    }

    // 检查是否是 API Key 认证
    const apiKey = request.apiKey;
    if (apiKey) {
      return {
        type: AuthType.API_KEY,
        userId: user.userId,
        username: user.username,
        email: user.email,
        authMethod: 'api_key',
        permissions: apiKey.permissions || [],
      };
    }

    // JWT 认证
    return {
      type: AuthType.JWT,
      userId: user.userId,
      username: user.username,
      email: user.email,
      authMethod: 'jwt',
    };
  }

  /**
   * 检查请求是否已认证
   */
  static isAuthenticated(request: Request): boolean {
    return !!request.user;
  }

  /**
   * 检查是否是 API Key 认证
   */
  static isApiKeyAuth(request: Request): boolean {
    return !!(request.apiKey);
  }

  /**
   * 检查是否是 JWT 认证
   */
  static isJwtAuth(request: Request): boolean {
    return this.isAuthenticated(request) && !this.isApiKeyAuth(request);
  }

  /**
   * 从请求头中提取 JWT Token
   */
  static extractJwtToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * 从请求头中提取 API Key
   */
  static extractApiKey(request: Request): string | null {
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }

    // 处理数组形式的 header
    if (Array.isArray(apiKeyHeader) && apiKeyHeader.length > 0) {
      return typeof apiKeyHeader[0] === 'string' ? apiKeyHeader[0] : null;
    }

    // 从查询参数中提取
    const query = request.query as any;
    if (typeof query.apiKey === 'string') {
      return query.apiKey;
    }
    if (typeof query.api_key === 'string') {
      return query.api_key;
    }

    return null;
  }

  /**
   * 验证 API Key 格式
   */
  static isValidApiKeyFormat(apiKey: string): boolean {
    return typeof apiKey === 'string' &&
           apiKey.startsWith('ak_') &&
           apiKey.length === 35;
  }

  /**
   * 获取用户 ID
   */
  static getUserId(request: Request): string | null {
    const user = request.user as any;
    return user?.userId || null;
  }

  /**
   * 获取用户权限列表
   */
  static getUserPermissions(request: Request): string[] {
    const authInfo = this.extractAuthInfo(request);
    return authInfo?.permissions || [];
  }

  /**
   * 检查用户是否有特定权限
   */
  static hasPermission(request: Request, permission: string): boolean {
    const permissions = this.getUserPermissions(request);
    return permissions.includes(permission) || permissions.includes('admin:all');
  }

  /**
   * 获取认证类型
   */
  static getAuthType(request: Request): AuthType {
    if (!this.isAuthenticated(request)) {
      return AuthType.NONE;
    }
    return this.isApiKeyAuth(request) ? AuthType.API_KEY : AuthType.JWT;
  }

  /**
   * 创建认证上下文日志
   */
  static createAuthContext(request: Request): Record<string, any> {
    const authInfo = this.extractAuthInfo(request);
    const authType = this.getAuthType(request);

    return {
      authType,
      userId: authInfo?.userId,
      username: authInfo?.username,
      authMethod: authInfo?.authMethod,
      isAuthenticated: this.isAuthenticated(request),
      hasApiKey: this.isApiKeyAuth(request),
      permissions: authInfo?.permissions || [],
    };
  }
}