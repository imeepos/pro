import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { ConfigService } from '@nestjs/config';
import { verifyViewerToken, fingerprintToken } from '../utils/viewer-token.verifier';
import { root } from '@pro/core';

export const TOKEN_BLACKLIST_PREFIX = 'blacklist:';

/**
 * WebSocket 连接认证服务
 * 处理 graphql-ws connection_init 消息中的 JWT 认证
 */
@Injectable()
export class GraphqlWsAuthService {
  private readonly logger = new Logger(GraphqlWsAuthService.name);
  private readonly blacklistPrefix = TOKEN_BLACKLIST_PREFIX;
  private readonly redisClient: RedisClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.redisClient = root.get(RedisClient);
  }

  /**
   * 从 connection_init 消息中提取并验证 JWT Token
   */
  async authenticateConnection(connectionParams: any): Promise<JwtPayload> {
    // 从 connection_params 中提取 authorization
    const authorization = connectionParams?.authorization;

    if (!authorization) {
      this.logger.warn('拒绝 WebSocket 握手：缺少授权信息');
      throw new Error('WebSocket连接缺少授权信息');
    }

    // 提取 Bearer token
    const token = this.extractBearerToken(authorization);
    if (!token) {
      this.logger.warn('拒绝 WebSocket 握手：授权格式无效');
      throw new Error('WebSocket连接授权格式无效，期望 Bearer Token');
    }

    const tokenFingerprint = fingerprintToken(token);
    const secret = this.config.get('JWT_SECRET', 'your-jwt-secret-change-in-production');
    this.logger.debug(`开始验证 WebSocket Token 指纹=${tokenFingerprint}`);
    try {
      const verification = await verifyViewerToken({
        token,
        secret,
        jwtService: this.jwtService,
        redisClient: this.redisClient,
        blacklistKeyPrefix: this.blacklistPrefix,
      });

      if (verification.status === 'blacklisted') {
        this.logger.warn(`拒绝 WebSocket 握手：Token 被列入黑名单 指纹=${tokenFingerprint}`);
        throw new Error('Token已失效，请重新登录');
      }

      if (verification.status === 'expired') {
        const expiresAt = verification.expiresAt ? `，过期时间：${verification.expiresAt}` : '';
        this.logger.warn(`拒绝 WebSocket 握手：Token 已过期 指纹=${tokenFingerprint}${expiresAt}`);
        throw new Error('Token已过期，请重新登录');
      }

      if (verification.status === 'invalid' || !verification.payload) {
        this.logger.warn(`拒绝 WebSocket 握手：Token 无效 指纹=${tokenFingerprint}`);
        throw new Error('Token验证失败');
      }

      this.logger.log(`WebSocket 握手通过：viewerId=${verification.payload.userId ?? 'unknown'} 指纹=${tokenFingerprint}`);
      return verification.payload;
    } catch (error) {
      if (error instanceof Error && /Token已/.test(error.message)) {
        throw error;
      }

      this.logger.error(`WebSocket Token 验证异常 指纹=${tokenFingerprint}: ${error instanceof Error ? error.message : error}`);
      throw new Error('Token验证失败');
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
