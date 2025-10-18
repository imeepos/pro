import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { redisConfigFactory } from '../../config';
import { ConfigService } from '@nestjs/config';

/**
 * WebSocket 连接认证服务
 * 处理 graphql-ws connection_init 消息中的 JWT 认证
 */
@Injectable()
export class GraphqlWsAuthService {
  private redisClient: RedisClient;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.redisClient = new RedisClient(redisConfigFactory(config));
  }

  /**
   * 从 connection_init 消息中提取并验证 JWT Token
   */
  async authenticateConnection(connectionParams: any): Promise<JwtPayload> {
    // 从 connection_params 中提取 authorization
    const authorization = connectionParams?.authorization;

    if (!authorization) {
      throw new Error('WebSocket连接缺少授权信息');
    }

    // 提取 Bearer token
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new Error('WebSocket连接授权格式无效，期望 Bearer Token');
    }

    // 检查 token 是否在黑名单中
    const isBlacklisted = await this.redisClient.exists(
      `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
    );

    if (isBlacklisted) {
      throw new Error('Token已失效，请重新登录');
    }

    try {
      // 验证 JWT token
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
      });

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token已过期，请重新登录');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token格式无效');
      } else {
        throw new Error('Token验证失败');
      }
    }
  }

  /**
   * 提取 Bearer token
   */
  private extractBearerToken(authorization: string): string | null {
    if (typeof authorization !== 'string') {
      return null;
    }

    const match = authorization.match(/^Bearer\s+(.+)$/);
    return match ? match[1] : null;
  }
}