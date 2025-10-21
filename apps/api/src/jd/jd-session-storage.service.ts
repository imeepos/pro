import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { redisConfigFactory } from '../config';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export type JdSessionState = 'active' | 'expired' | 'completed';

export interface JdSessionRecord {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  status: JdSessionState;
  lastEvent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class JdSessionStorage implements OnModuleInit, OnModuleDestroy {
  private redis: RedisClient;
  private cleanupTimer?: NodeJS.Timeout;

  private readonly SESSION_PREFIX = 'jd:session:';
  private readonly SESSION_TTL_SECONDS = 300;
  private readonly CLEANUP_INTERVAL_MS = 60000;

  constructor(
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(JdSessionStorage.name);
  }

  async onModuleInit(): Promise<void> {
    this.redis = new RedisClient(redisConfigFactory(this.config));
    this.logger.info('JD session storage ready');
    this.startCleanupTask();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.redis) {
      await this.redis.close();
      this.logger.info('JD session storage closed');
    }
  }

  async createSession(userId: string, metadata?: Record<string, unknown>): Promise<JdSessionRecord> {
    const sessionId = `${userId}_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.SESSION_TTL_SECONDS * 1000);

    const record: JdSessionRecord = {
      sessionId,
      userId,
      createdAt,
      expiresAt,
      status: 'active',
      metadata,
    };

    await this.redis.set(this.buildKey(sessionId), record, this.SESSION_TTL_SECONDS);
    this.logger.info('JD login session created', { sessionId, userId });
    return record;
  }

  async getSession(sessionId: string): Promise<JdSessionRecord | null> {
    try {
      const record = await this.redis.get<JdSessionRecord>(this.buildKey(sessionId));
      if (!record) {
        return null;
      }

      const normalized = this.normalizeDates(record);
      if (this.isExpired(normalized)) {
        await this.markExpired(sessionId, normalized);
        return null;
      }

      return normalized;
    } catch (error) {
      this.logger.error('Failed to read JD login session', { sessionId, error });
      return null;
    }
  }

  async updateSessionEvent(sessionId: string, event: Record<string, unknown>): Promise<void> {
    const record = await this.redis.get<JdSessionRecord>(this.buildKey(sessionId));
    if (!record) {
      return;
    }

    const normalized = this.normalizeDates(record);
    normalized.lastEvent = event;

    await this.redis.set(
      this.buildKey(sessionId),
      normalized,
      this.computeRemainingTtlSeconds(normalized.expiresAt),
    );
  }

  async updateSessionStatus(sessionId: string, status: JdSessionState): Promise<void> {
    const record = await this.redis.get<JdSessionRecord>(this.buildKey(sessionId));
    if (!record) {
      return;
    }

    const normalized = this.normalizeDates(record);
    normalized.status = status;

    await this.redis.set(
      this.buildKey(sessionId),
      normalized,
      this.resolveTtlByStatus(status, normalized.expiresAt),
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.buildKey(sessionId));
    } catch (error) {
      this.logger.error('Failed to delete JD login session', { sessionId, error });
    }
  }

  async getUserActiveSessions(userId: string): Promise<JdSessionRecord[]> {
    try {
      const keys = await this.redis.keys(`${this.SESSION_PREFIX}${userId}_*`);
      const sessions: JdSessionRecord[] = [];

      for (const key of keys) {
        const sessionId = key.replace(this.SESSION_PREFIX, '');
        const session = await this.getSession(sessionId);
        if (session && session.status === 'active') {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error('Failed to load active JD login sessions', { userId, error });
      return [];
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
      let cleaned = 0;

      for (const key of keys) {
        const data = await this.redis.get<JdSessionRecord>(key);
        if (data && this.isExpired(data)) {
          const sessionId = key.replace(this.SESSION_PREFIX, '');
          await this.updateSessionStatus(sessionId, 'expired');
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info('JD session cleanup performed', { count: cleaned });
      }

      return cleaned;
    } catch (error) {
      this.logger.error('JD session cleanup failed', { error });
      return 0;
    }
  }

  async getStats(): Promise<{ total: number; active: number; expired: number; completed: number }> {
    try {
      const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
      const stats = { total: keys.length, active: 0, expired: 0, completed: 0 };

      for (const key of keys) {
        const record = await this.redis.get<JdSessionRecord>(key);
        if (!record) continue;

        const normalized = this.normalizeDates(record);
        if (this.isExpired(normalized) || normalized.status === 'expired') {
          stats.expired++;
        } else if (normalized.status === 'completed') {
          stats.completed++;
        } else {
          stats.active++;
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to collect JD session stats', { error });
      return { total: 0, active: 0, expired: 0, completed: 0 };
    }
  }

  private buildKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  private normalizeDates(record: JdSessionRecord): JdSessionRecord {
    return {
      ...record,
      createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt),
      expiresAt: record.expiresAt instanceof Date ? record.expiresAt : new Date(record.expiresAt),
    };
  }

  private isExpired(record: JdSessionRecord): boolean {
    return Date.now() >= record.expiresAt.getTime();
  }

  private computeRemainingTtlSeconds(expiresAt: Date): number {
    return Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  }

  private resolveTtlByStatus(status: JdSessionState, expiresAt: Date): number {
    if (status === 'completed') {
      return 60;
    }

    if (status === 'expired') {
      return 30;
    }

    return this.computeRemainingTtlSeconds(expiresAt);
  }

  private async markExpired(sessionId: string, record: JdSessionRecord): Promise<void> {
    try {
      record.status = 'expired';
      await this.redis.set(this.buildKey(sessionId), record, 30);
    } catch (error) {
      this.logger.error('Failed to mark JD login session expired', { sessionId, error });
    }
  }

  private startCleanupTask(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MS);

    this.logger.debug('JD session cleanup task started', { interval: this.CLEANUP_INTERVAL_MS });
  }
}
