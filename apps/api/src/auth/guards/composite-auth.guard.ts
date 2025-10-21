import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { resolveRequest } from '../../common/utils/context.utils';
import { GraphqlWsAuthService } from '../services/graphql-ws-auth.service';

/**
 * 复合认证守卫
 * 支持 JWT Bearer Token 和 API Key 两种认证方式
 * 优先级：JWT -> API Key
 */
@Injectable()
export class CompositeAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(CompositeAuthGuard.name);

  constructor(
    private readonly wsAuthService: GraphqlWsAuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = resolveRequest(context);

    await this.tryRestoreWebsocketContext(request);

    if (request.user) {
      this.logger.debug('检测到已认证用户上下文，跳过重复认证');
      return true;
    }

    try {
      // 尝试 JWT 认证
      const jwtGuard = new JwtAuthGuard();
      const jwtResult = await jwtGuard.canActivate(context);

      if (jwtResult && request.user) {
        this.logger.debug('JWT 认证成功');
        return true;
      }
    } catch (error) {
      this.logger.debug('JWT 认证失败，尝试 API Key 认证');
    }

    try {
      // JWT 失败，尝试 API Key 认证
      const apiKeyGuard = new ApiKeyAuthGuard();
      const apiKeyResult = await apiKeyGuard.canActivate(context);

      if (apiKeyResult && request.user) {
        this.logger.debug('API Key 认证成功');
        return true;
      }
    } catch (error) {
      this.logger.debug('API Key 认证失败');
    }

    // 两种认证方式都失败
    throw new UnauthorizedException('未授权访问，请提供有效的 JWT Token 或 API Key');
  }

  getRequest(context: ExecutionContext) {
    return resolveRequest(context);
  }

  // 重写 handleRequest 以确保认证用户信息正确设置
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = resolveRequest(context);

    // 如果已经有用户信息，直接返回
    if (request.user) {
      return request.user;
    }

    // 否则使用默认逻辑
    return super.handleRequest(err, user, info, context);
  }

  private async tryRestoreWebsocketContext(request: ReturnType<typeof resolveRequest>) {
    if (!request || request.user || !request.connectionParams) {
      return;
    }

    try {
      const user = await this.wsAuthService.authenticateConnection(request.connectionParams);
      request.user = user;
      request.headers = this.mergeHeadersFromConnectionParams(request.headers ?? {}, request.connectionParams);
      this.logger.debug('通过 WebSocket 连接参数恢复认证上下文');
    } catch (error) {
      this.logger.debug('WebSocket 连接参数未通过认证校验');
    }
  }

  private mergeHeadersFromConnectionParams(
    currentHeaders: Record<string, any>,
    connectionParams: Record<string, unknown>,
  ) {
    const headers = { ...currentHeaders };

    const authorization = this.extractAuthorization(connectionParams);
    if (authorization && !headers.authorization) {
      headers.authorization = authorization;
    }

    const apiKey = this.extractApiKey(connectionParams);
    if (apiKey && !headers['x-api-key']) {
      headers['x-api-key'] = apiKey;
    }

    return headers;
  }

  private extractAuthorization(connectionParams: Record<string, unknown>) {
    const token = connectionParams?.['authorization'];
    return typeof token === 'string' ? token : undefined;
  }

  private extractApiKey(connectionParams: Record<string, unknown>) {
    const candidates = ['x-api-key', 'apiKey', 'api_key'] as const;

    for (const key of candidates) {
      const value = connectionParams?.[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }
}
