import { Test, TestingModule } from '@nestjs/testing';
import { WeiboSessionStorage } from '../weibo-session-storage.service';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { ConfigService } from '@nestjs/config';

describe('WeiboSessionStorage', () => {
  let service: WeiboSessionStorage;
  let mockRedis: jest.Mocked<RedisClient>;
  let mockLogger: jest.Mocked<PinoLogger>;
  let mockConfig: jest.Mocked<ConfigService>;

  const mockSessionData = {
    sessionId: 'test-session-123',
    userId: 'user-123',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 300000), // 5分钟后
    status: 'active' as const,
    metadata: { userAgent: 'test-agent' },
  };

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      close: jest.fn(),
      zincrby: jest.fn(),
      zrangebyscore: jest.fn(),
      hmset: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      pipeline: jest.fn(),
    } as any;

    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockConfig = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboSessionStorage,
        {
          provide: RedisClient,
          useValue: mockRedis,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<WeiboSessionStorage>(WeiboSessionStorage);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('createSession', () => {
    it('should create a new session with proper TTL', async () => {
      mockRedis.set.mockResolvedValue();

      const result = await service.createSession('user-123', { test: 'data' });

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          status: 'active',
          metadata: { test: 'data' },
        })
      );
      expect(result.sessionId).toMatch(/^user-123_\d+_[a-f0-9]{8}$/);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('weibo:session:'),
        expect.any(Object),
        300 // 5 minutes TTL
      );
    });

    it('should log session creation', async () => {
      mockRedis.set.mockResolvedValue();

      await service.createSession('user-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '创建微博登录会话',
        expect.objectContaining({
          sessionId: expect.any(String),
          userId: 'user-123',
        })
      );
    });
  });

  describe('getSession', () => {
    it('should return session data when session exists and is not expired', async () => {
      mockRedis.get.mockResolvedValue(mockSessionData);

      const result = await service.getSession('test-session-123');

      expect(result).toEqual(mockSessionData);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '获取会话数据',
        expect.objectContaining({ sessionId: 'test-session-123' })
      );
    });

    it('should return null when session does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSession('non-existent-session');

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '会话不存在',
        { sessionId: 'non-existent-session' }
      );
    });

    it('should return null and update status when session is expired', async () => {
      const expiredSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() - 1000), // 已过期
      };
      mockRedis.get.mockResolvedValue(expiredSession);
      mockRedis.set.mockResolvedValue();

      const result = await service.getSession('expired-session');

      expect(result).toBeNull();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('weibo:session:expired-session'),
        expect.objectContaining({ status: 'expired' }),
        30 // 30 seconds TTL for expired sessions
      );
    });
  });

  describe('updateSessionEvent', () => {
    it('should update session event successfully', async () => {
      const eventData = { type: 'qrcode', data: { image: 'base64image' } };
      mockRedis.get.mockResolvedValue(mockSessionData);
      mockRedis.set.mockResolvedValue();

      const result = await service.updateSessionEvent('test-session-123', eventData);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '更新会话事件',
        expect.objectContaining({
          sessionId: 'test-session-123',
          eventType: 'qrcode',
        })
      );
    });

    it('should return false when session does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.updateSessionEvent('non-existent-session', {});

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockResolvedValue(mockSessionData);
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.updateSessionEvent('test-session-123', {});

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '更新会话事件失败',
        expect.objectContaining({
          sessionId: 'test-session-123',
        })
      );
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status with appropriate TTL', async () => {
      mockRedis.get.mockResolvedValue(mockSessionData);
      mockRedis.set.mockResolvedValue();

      const result = await service.updateSessionStatus('test-session-123', 'completed');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('weibo:session:test-session-123'),
        expect.objectContaining({ status: 'completed' }),
        60 // 1 minute TTL for completed sessions
      );
    });

    it('should use different TTL values for different statuses', async () => {
      const activeSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() + 60000), // 1 minute remaining
      };
      mockRedis.get.mockResolvedValue(activeSession);
      mockRedis.set.mockResolvedValue();

      await service.updateSessionStatus('test-session-123', 'active');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Number)
      );

      mockRedis.get.mockResolvedValue(activeSession);
      await service.updateSessionStatus('test-session-123', 'expired');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        30 // 30 seconds for expired sessions
      );
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return only active sessions for a user', async () => {
      const activeSession1 = { ...mockSessionData, sessionId: 'session-1', status: 'active' };
      const activeSession2 = { ...mockSessionData, sessionId: 'session-2', status: 'active' };
      const expiredSession = { ...mockSessionData, sessionId: 'session-3', status: 'expired' };

      mockRedis.keys.mockResolvedValue([
        'weibo:session:user-123_session-1',
        'weibo:session:user-123_session-2',
        'weibo:session:user-123_session-3',
      ]);

      mockRedis.get
        .mockResolvedValueOnce(activeSession1)
        .mockResolvedValueOnce(activeSession2)
        .mockResolvedValueOnce(expiredSession);

      const result = await service.getUserActiveSessions('user-123');

      expect(result).toHaveLength(2);
      expect(result.map(s => s.sessionId)).toEqual(['session-1', 'session-2']);
    });

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.getUserActiveSessions('user-123');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取用户活跃会话失败',
        expect.objectContaining({ userId: 'user-123' })
      );
    });
  });

  describe('getStats', () => {
    it('should return accurate session statistics', async () => {
      const mockKeys = ['weibo:session:1', 'weibo:session:2', 'weibo:session:3'];
      const mockSessions = [
        { ...mockSessionData, status: 'active' },
        { ...mockSessionData, status: 'expired', expiresAt: new Date(Date.now() - 1000) },
        { ...mockSessionData, status: 'completed' },
      ];

      mockRedis.keys.mockResolvedValue(mockKeys);
      mockRedis.get
        .mockResolvedValueOnce(mockSessions[0])
        .mockResolvedValueOnce(mockSessions[1])
        .mockResolvedValueOnce(mockSessions[2]);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 3,
        active: 1,
        expired: 1,
        completed: 1,
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions and return count', async () => {
      const expiredSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() - 1000), // 已过期
        status: 'active' as const,
      };

      mockRedis.keys.mockResolvedValue(['weibo:session:expired-session']);
      mockRedis.get.mockResolvedValue(expiredSession);
      mockRedis.set.mockResolvedValue();

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('weibo:session:expired-session'),
        expect.objectContaining({ status: 'expired' }),
        30
      );
    });

    it('should return 0 when no sessions need cleanup', async () => {
      const activeSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() + 300000), // 未过期
      };

      mockRedis.keys.mockResolvedValue(['weibo:session:active-session']);
      mockRedis.get.mockResolvedValue(activeSession);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});