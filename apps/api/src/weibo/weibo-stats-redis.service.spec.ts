import { Test, TestingModule } from '@nestjs/testing';
import { WeiboStatsRedisService } from './weibo-stats-redis.service';
import { RedisClient } from '@pro/redis';
import { ConsumerStats } from './interfaces/weibo-task-status.interface';

describe('WeiboStatsRedisService', () => {
  let service: WeiboStatsRedisService;
  let mockRedisClient: jest.Mocked<RedisClient>;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      close: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboStatsRedisService,
        {
          provide: RedisClient,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<WeiboStatsRedisService>(WeiboStatsRedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should test Redis connection', async () => {
      await service.onModuleInit();
      expect(mockRedisClient.set).toHaveBeenCalledWith('test:connection', 'ok', 10);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:connection');
    });

    it('should throw error if Redis connection fails', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Connection failed'));
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('getStats', () => {
    it('should return stats from Redis', async () => {
      const mockStatsData = {
        totalMessages: 100,
        successCount: 90,
        failureCount: 5,
        retryCount: 5,
        avgProcessingTime: 25.5,
        lastProcessedAt: '2023-01-01T12:00:00.000Z',
      };

      mockRedisClient.get.mockResolvedValue(mockStatsData);

      const result = await service.getStats();

      expect(result).toEqual({
        totalMessages: 100,
        successCount: 90,
        failureCount: 5,
        retryCount: 5,
        avgProcessingTime: 25.5,
        lastProcessedAt: new Date('2023-01-01T12:00:00.000Z'),
      });
    });

    it('should return default stats if no data exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getStats();

      expect(result).toEqual({
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        avgProcessingTime: 0,
      });
    });

    it('should return default stats if Redis fails', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getStats();

      expect(result).toEqual({
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        avgProcessingTime: 0,
      });
    });
  });

  describe('updateStats', () => {
    it('should update stats and processing times', async () => {
      const mockStats: ConsumerStats = {
        totalMessages: 10,
        successCount: 9,
        failureCount: 1,
        retryCount: 0,
        avgProcessingTime: 20.0,
      };

      const mockProcessingTimes = [15, 25, 20];

      // Mock getStats to return existing stats
      jest.spyOn(service, 'getStats').mockResolvedValue(mockStats);

      // Mock getProcessingTimes to return existing times
      mockRedisClient.get.mockResolvedValue(mockProcessingTimes);

      await service.updateStats('success', 30);

      // Verify set was called twice (stats and processing times)
      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'weibo:consumer:stats',
        expect.objectContaining({
          totalMessages: 11,
          successCount: 10,
          avgProcessingTime: 22.5, // (15+25+20+30)/4
        }),
        30 * 24 * 60 * 60
      );
    });
  });

  describe('resetStats', () => {
    it('should delete all stats keys', async () => {
      await service.resetStats();

      expect(mockRedisClient.del).toHaveBeenCalledWith('weibo:consumer:stats');
      expect(mockRedisClient.del).toHaveBeenCalledWith('weibo:consumer:stats:processing_times');
    });
  });

  describe('isRedisAvailable', () => {
    it('should return true if Redis is available', async () => {
      await service.isRedisAvailable();

      expect(mockRedisClient.set).toHaveBeenCalledWith('test:availability', 'ok', 5);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:availability');
    });

    it('should return false if Redis is not available', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isRedisAvailable();

      expect(result).toBe(false);
    });
  });
});