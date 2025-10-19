import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger';
import { HourlyStatsEntity, DailyStatsEntity } from '@pro/entities';
import { TransactionService } from '../services/transaction.service';
import { TransactionMetricsService } from '../services/transaction-metrics.service';
import { CacheConsistencyService } from '../services/cache-consistency.service';
import { CacheService } from '../services/cache.service';
import { HourlyAggregatorService } from '../services/hourly-aggregator.service';
import { DailyAggregatorService } from '../services/daily-aggregator.service';

describe('事务集成测试', () => {
  let module: TestingModule;
  let transactionService: TransactionService;
  let metricsService: TransactionMetricsService;
  let hourlyAggregatorService: HourlyAggregatorService;
  let dailyAggregatorService: DailyAggregatorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'sqlite',
            database: ':memory:',
            entities: [HourlyStatsEntity, DailyStatsEntity],
            synchronize: true,
            logging: false,
          }),
        }),
        TypeOrmModule.forFeature([HourlyStatsEntity, DailyStatsEntity]),
      ],
      providers: [
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            invalidateKey: jest.fn().mockResolvedValue(true),
            buildHourlyKey: jest.fn((keyword, date) => `hourly:${keyword}:${date.getTime()}`),
            buildDailyKey: jest.fn((keyword, date) => `daily:${keyword}:${date.getTime()}`),
          },
        },
        TransactionService,
        TransactionMetricsService,
        CacheConsistencyService,
        HourlyAggregatorService,
        DailyAggregatorService,
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
    metricsService = module.get<TransactionMetricsService>(TransactionMetricsService);
    hourlyAggregatorService = module.get<HourlyAggregatorService>(HourlyAggregatorService);
    dailyAggregatorService = module.get<DailyAggregatorService>(DailyAggregatorService);
  });

  afterAll(async () => {
    await module?.close();
  });

  describe('TransactionService', () => {
    it('应该成功执行简单事务', async () => {
      const result = await transactionService.executeInTransaction(
        async (context) => {
          return { message: '测试成功' };
        },
        { description: '简单事务测试' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: '测试成功' });
      expect(result.attempts).toBe(1);
    });

    it('应该正确处理事务失败', async () => {
      const result = await transactionService.executeInTransaction(
        async (context) => {
          throw new Error('测试错误');
        },
        { description: '失败事务测试', maxRetries: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('测试错误');
      expect(result.attempts).toBe(2);
    });

    it('应该正确执行批量操作', async () => {
      const items = [1, 2, 3, 4, 5];
      const processedItems: number[] = [];

      const result = await transactionService.executeBatch(
        items,
        async (item, context) => {
          processedItems.push(item);
        },
        2, // 批量大小
        { description: '批量操作测试' }
      );

      expect(result.processed).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(processedItems).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('TransactionMetricsService', () => {
    beforeEach(() => {
      metricsService.clearMetrics();
    });

    it('应该正确记录事务指标', () => {
      const metric = {
        operation: 'test-operation',
        duration: 1000,
        attempts: 1,
        success: true,
        timestamp: new Date(),
        isolationLevel: 'READ_COMMITTED',
      };

      metricsService.recordTransaction(metric);

      const aggregated = metricsService.getAggregatedMetrics();
      expect(aggregated.totalOperations).toBe(1);
      expect(aggregated.successRate).toBe(1);
      expect(aggregated.avgDuration).toBe(1000);
    });

    it('应该正确计算成功率', () => {
      // 记录3个成功和2个失败的事务
      for (let i = 0; i < 3; i++) {
        metricsService.recordTransaction({
          operation: 'success-op',
          duration: 500,
          attempts: 1,
          success: true,
          timestamp: new Date(),
          isolationLevel: 'READ_COMMITTED',
        });
      }

      for (let i = 0; i < 2; i++) {
        metricsService.recordTransaction({
          operation: 'fail-op',
          duration: 1000,
          attempts: 3,
          success: false,
          timestamp: new Date(),
          isolationLevel: 'READ_COMMITTED',
          error: '测试错误',
        });
      }

      const aggregated = metricsService.getAggregatedMetrics();
      expect(aggregated.totalOperations).toBe(5);
      expect(aggregated.successRate).toBe(0.6);
    });

    it('应该生成性能报告', () => {
      metricsService.recordTransaction({
        operation: 'slow-operation',
        duration: 6000, // 超过阈值
        attempts: 1,
        success: true,
        timestamp: new Date(),
        isolationLevel: 'READ_COMMITTED',
      });

      const report = metricsService.generatePerformanceReport();

      expect(report.summary.totalOperations).toBe(1);
      expect(report.summary.slowOperationsCount).toBe(1);
      expect(report.recommendations).toContain(
        expect.stringContaining('平均事务时间较长')
      );
    });
  });

  describe('HourlyAggregatorService 事务集成', () => {
    it('应该在事务中更新小时统计', async () => {
      const updateData = {
        keyword: 'test-keyword',
        timestamp: new Date(),
        postCount: 5,
        commentCount: 10,
        sentiment: { score: 0.7, label: 'positive' },
        keywords: ['关键词1', '关键词2'],
      };

      await expect(
        hourlyAggregatorService.updateHourlyStats(updateData)
      ).resolves.not.toThrow();

      const metrics = metricsService.getAggregatedMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('错误恢复测试', () => {
    it('应该在死锁时重试', async () => {
      let attemptCount = 0;

      const result = await transactionService.executeInTransaction(
        async (context) => {
          attemptCount++;
          if (attemptCount <= 2) {
            const error = new Error('deadlock detected');
            throw error;
          }
          return { success: true, attempts: attemptCount };
        },
        {
          description: '死锁重试测试',
          retryOnDeadlock: true,
          maxRetries: 3,
        }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(attemptCount).toBe(3);
    });
  });

  describe('缓存一致性测试', () => {
    it('应该在事务成功后维护缓存一致性', async () => {
      const cacheService = module.get<CacheService>(CacheService);
      const consistencyService = module.get<CacheConsistencyService>(CacheConsistencyService);

      const hook = consistencyService.createTransactionHook();

      await hook.scheduleInvalidation('hourly-stats-update', {
        keyword: 'test-keyword',
      });

      await hook.onCommit('test-transaction-id');

      expect(cacheService.invalidateKey).toHaveBeenCalled();
    });
  });
});