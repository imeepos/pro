import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { redisConfigFactory } from '../config';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * 会话数据接口
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastEvent?: any;
  status: 'active' | 'expired' | 'completed';
  metadata?: Record<string, any>;
}

/**
 * Redis 会话存储管理器
 * 提供优雅的会话持久化、过期管理和状态查询
 */
@Injectable()
export class WeiboSessionStorage implements OnModuleInit, OnModuleDestroy {
  private redis: RedisClient;
  private readonly SESSION_PREFIX = 'weibo:session:';
  private readonly SESSION_TTL = 300; // 5分钟过期时间
  private readonly CLEANUP_INTERVAL = 60000; // 1分钟清理一次过期会话
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(WeiboSessionStorage.name);
  }

  async onModuleInit() {
    this.redis = new RedisClient(redisConfigFactory(this.config));
    this.logger.info('微博会话存储已初始化');

    // 启动定期清理任务
    this.startCleanupTask();
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.redis) {
      await this.redis.close();
      this.logger.info('微博会话存储已关闭');
    }
  }

  /**
   * 创建新的登录会话
   */
  async createSession(userId: string, metadata?: Record<string, any>): Promise<SessionData> {
    const sessionId = `${userId}_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt,
      status: 'active',
      metadata,
    };

    // 存储到 Redis，设置过期时间
    await this.redis.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      sessionData,
      this.SESSION_TTL
    );

    this.logger.info(`创建微博登录会话`, { sessionId, userId, expiresAt });

    return sessionData;
  }

  /**
   * 获取会话数据
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await this.redis.get<SessionData>(
        `${this.SESSION_PREFIX}${sessionId}`
      );

      if (!sessionData) {
        this.logger.debug(`会话不存在`, { sessionId });
        return null;
      }

      // 检查是否过期
      if (this.isSessionExpired(sessionData)) {
        await this.updateSessionStatus(sessionId, 'expired');
        this.logger.debug(`会话已过期`, { sessionId });
        return null;
      }

      return sessionData;
    } catch (error) {
      this.logger.error(`获取会话失败`, { sessionId, error });
      return null;
    }
  }

  /**
   * 更新会话的最后事件
   */
  async updateSessionEvent(sessionId: string, eventData: any): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      session.lastEvent = eventData;

      // 计算剩余 TTL
      const remainingTtl = Math.max(
        1,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      );

      await this.redis.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        remainingTtl
      );

      this.logger.debug(`更新会话事件`, { sessionId, eventType: eventData?.type });
      return true;
    } catch (error) {
      this.logger.error(`更新会话事件失败`, { sessionId, error });
      return false;
    }
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'expired' | 'completed'
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      session.status = status;

      // 根据状态设置不同的 TTL
      let ttl: number;
      if (status === 'completed') {
        ttl = 60; // 已完成的会话保留1分钟用于查询
      } else if (status === 'expired') {
        ttl = 30; // 过期的会话保留30秒用于调试
      } else {
        ttl = Math.max(
          1,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
        );
      }

      await this.redis.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        ttl
      );

      this.logger.info(`更新会话状态`, { sessionId, status });
      return true;
    } catch (error) {
      this.logger.error(`更新会话状态失败`, { sessionId, status, error });
      return false;
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
      this.logger.debug(`删除会话`, { sessionId });
      return true;
    } catch (error) {
      this.logger.error(`删除会话失败`, { sessionId, error });
      return false;
    }
  }

  /**
   * 获取用户的所有活跃会话
   */
  async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    try {
      const pattern = `${this.SESSION_PREFIX}${userId}_*`;
      const keys = await this.redis.keys(pattern);

      const sessions: SessionData[] = [];
      for (const key of keys) {
        const sessionId = key.replace(this.SESSION_PREFIX, '');
        const session = await this.getSession(sessionId);
        if (session && session.status === 'active') {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error(`获取用户活跃会话失败`, { userId, error });
      return [];
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const sessionId = key.replace(this.SESSION_PREFIX, '');
        const session = await this.redis.get<SessionData>(key);

        if (session && this.isSessionExpired(session)) {
          await this.updateSessionStatus(sessionId, 'expired');
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`清理过期会话`, { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(`清理过期会话失败`, { error });
      return 0;
    }
  }

  /**
   * 检查会话是否过期
   */
  private isSessionExpired(session: SessionData): boolean {
    return Date.now() >= session.expiresAt.getTime();
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask(): void {
    this.cleanupTimer = setInterval(
      async () => {
        await this.cleanupExpiredSessions();
      },
      this.CLEANUP_INTERVAL
    );

    this.logger.debug(`启动会话清理任务`, { interval: this.CLEANUP_INTERVAL });
  }

  /**
   * 获取会话统计信息
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    completed: number;
  }> {
    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      const stats = { total: keys.length, active: 0, expired: 0, completed: 0 };

      for (const key of keys) {
        const session = await this.redis.get<SessionData>(key);
        if (session) {
          if (this.isSessionExpired(session) || session.status === 'expired') {
            stats.expired++;
          } else if (session.status === 'completed') {
            stats.completed++;
          } else {
            stats.active++;
          }
        }
      }

      return stats;
    } catch (error) {
      this.logger.error(`获取会话统计失败`, { error });
      return { total: 0, active: 0, expired: 0, completed: 0 };
    }
  }
}