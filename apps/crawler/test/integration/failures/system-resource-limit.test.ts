import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CrawlerModule } from '../../src/crawler.module';
import { WeiboCrawlerService } from '../../src/services/weibo-crawler.service';
import { ResourceManagerService } from '../../src/services/resource-manager.service';
import { ConnectionPoolService } from '../../src/services/connection-pool.service';
import { TaskQueueService } from '../../src/services/task-queue.service';
import { Logger } from '@pro/logger';
import { setTimeout } from 'timers/promises';

describe('SystemResourceLimitTest', () => {
  let app: INestApplication;
  let crawlerService: WeiboCrawlerService;
  let resourceManager: ResourceManagerService;
  let connectionPool: ConnectionPoolService;
  let taskQueue: TaskQueueService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    crawlerService = moduleFixture.get<WeiboCrawlerService>(WeiboCrawlerService);
    resourceManager = moduleFixture.get<ResourceManagerService>(ResourceManagerService);
    connectionPool = moduleFixture.get<ConnectionPoolService>(ConnectionPoolService);
    taskQueue = moduleFixture.get<TaskQueueService>(TaskQueueService);
    logger = moduleFixture.get<Logger>(Logger);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('内存限制处理', () => {
    it('应该在内存使用过高时触发垃圾回收', async () => {
      const memoryMonitorSpy = jest.spyOn(resourceManager, 'monitorMemoryUsage');
      const gcSpy = jest.spyOn(global, 'gc');

      memoryMonitorSpy.mockImplementation(() => {
        const usage = process.memoryUsage();
        if (usage.heapUsed > 500 * 1024 * 1024) {
          global.gc?.();
          return {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            pressure: 'high',
            triggeredGC: true
          };
        }
        return {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          pressure: 'normal',
          triggeredGC: false
        };
      });

      const memoryHogTask = async () => {
        const largeArrays = [];
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(100000).fill('memory_hog_data'));
          if (i % 10 === 0) {
            await resourceManager.checkMemoryPressure();
          }
        }
        return largeArrays.length;
      };

      const result = await resourceManager.executeWithMemoryControl(memoryHogTask, {
        maxMemoryMB: 100,
        enableGC: true
      });

      expect(result.success).toBe(true);
      expect(gcSpy).toHaveBeenCalled();
      expect(result.gcTriggered).toBe(true);

      memoryMonitorSpy.mockRestore();
      gcSpy.mockRestore();
    });

    it('应该在内存不足时优雅降级处理策略', async () => {
      const memoryStrategySpy = jest.spyOn(resourceManager, 'adaptStrategyForMemory');

      const lowMemoryScenario = {
        availableMemory: 50 * 1024 * 1024,
        totalMemory: 512 * 1024 * 1024,
        pressure: 'critical'
      };

      memoryStrategySpy.mockReturnValue({
        batchSize: 10,
        concurrency: 1,
        enableStreaming: true,
        enableCompression: true,
        cacheStrategy: 'minimal'
      });

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `memory_test_${i}`,
        content: 'x'.repeat(1000),
        timestamp: Date.now() + i
      }));

      const result = await resourceManager.processWithMemoryConstraints(
        largeDataset,
        lowMemoryScenario
      );

      expect(result.processedCount).toBe(1000);
      expect(result.strategy).toMatchObject({
        batchSize: 10,
        concurrency: 1,
        enableStreaming: true
      });
      expect(result.memoryEfficient).toBe(true);

      memoryStrategySpy.mockRestore();
    });

    it('应该实施内存泄漏检测和预防', async () => {
      const leakDetectorSpy = jest.spyOn(resourceManager, 'detectMemoryLeaks');

      const leakyFunction = () => {
        const leakyData = new Map();
        setInterval(() => {
          leakyData.set(Date.now(), new Array(10000).fill('leak'));
        }, 100);
        return leakyData;
      };

      leakDetectorSpy.mockImplementation(() => {
        const memoryGrowth = resourceManager.calculateMemoryGrowth();
        return {
          hasLeak: memoryGrowth.growthRate > 0.1,
          suspectedObjects: ['Map', 'Array'],
          growthRate: memoryGrowth.growthRate,
          recommendations: memoryGrowth.growthRate > 0.1 ? [
            'Reduce cache size',
            'Implement object pooling',
            'Add explicit cleanup'
          ] : []
        };
      });

      const leakyTask = async () => {
        const leakyObject = leakyFunction();
        await setTimeout(1000);
        return { status: 'completed', objects: leakyObject.size };
      };

      const leakDetection = await resourceManager.executeWithLeakDetection(leakyTask);

      expect(leakDetection.leakDetected).toBe(true);
      expect(leakDetection.recommendations).toContain('Reduce cache size');
      expect(leakDetectorSpy).toHaveBeenCalled();

      leakDetectorSpy.mockRestore();
    });
  });

  describe('CPU资源竞争处理', () => {
    it('应该在CPU密集型任务中实现优雅降级', async () => {
      const cpuMonitorSpy = jest.spyOn(resourceManager, 'monitorCpuUsage');

      cpuMonitorSpy.mockReturnValue({
        usage: 95,
        loadAverage: [2.5, 2.3, 2.1],
        availableCores: 4,
        pressure: 'high'
      });

      const cpuIntensiveTask = async (iterations: number) => {
        let result = 0;
        for (let i = 0; i < iterations; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
          if (i % 10000 === 0) {
            await resourceManager.checkCpuPressure();
          }
        }
        return result;
      };

      const adaptiveExecution = await resourceManager.executeWithCpuControl(
        () => cpuIntensiveTask(100000),
        {
          maxCpuUsage: 80,
          enableThrottling: true,
          chunkSize: 10000
        }
      );

      expect(adaptiveExecution.success).toBe(true);
      expect(adaptiveExecution.throttlingApplied).toBe(true);
      expect(adaptiveExecution.totalPauseTime).toBeGreaterThan(0);

      cpuMonitorSpy.mockRestore();
    });

    it('应该实现任务优先级调度管理CPU资源', async () => {
      const highPriorityTask = jest.fn().mockResolvedValue({ result: 'high_priority' });
      const mediumPriorityTask = jest.fn().mockResolvedValue({ result: 'medium_priority' });
      const lowPriorityTask = jest.fn().mockResolvedValue({ result: 'low_priority' });

      const scheduler = resourceManager.createPriorityScheduler({
        maxConcurrentTasks: 2,
        timeSliceMs: 100
      });

      const tasks = [
        scheduler.addTask({ priority: 'low', execute: lowPriorityTask }),
        scheduler.addTask({ priority: 'high', execute: highPriorityTask }),
        scheduler.addTask({ priority: 'medium', execute: mediumPriorityTask })
      ];

      const results = await Promise.all(tasks);

      expect(results[0].result).toBe('high_priority');
      expect(results[1].result).toBe('medium_priority');
      expect(results[2].result).toBe('low_priority');
      expect(highPriorityTask).toHaveBeenCalledBefore(mediumPriorityTask);
      expect(mediumPriorityTask).toHaveBeenCalledBefore(lowPriorityTask);
    });

    it('应该在CPU过载时暂停非关键任务', async () => {
      const criticalTask = jest.fn().mockResolvedValue({ status: 'critical_completed' });
      const nonCriticalTask = jest.fn().mockResolvedValue({ status: 'non_critical_completed' });

      resourceManager.setCpuThreshold({ critical: 90, warning: 80 });

      jest.spyOn(resourceManager, 'getCurrentCpuUsage').mockReturnValue(95);

      const taskExecution = await resourceManager.executeWithCpuThrottling([
        { type: 'critical', task: criticalTask },
        { type: 'non_critical', task: nonCriticalTask }
      ]);

      expect(taskExecution.completed.critical).toBe(true);
      expect(taskExecution.completed.non_critical).toBe(false);
      expect(taskExecution.deferred).toContain('non_critical');
      expect(criticalTask).toHaveBeenCalled();
      expect(nonCriticalTask).not.toHaveBeenCalled();
    });
  });

  describe('数据库连接池耗尽处理', () => {
    it('应该在连接池耗尽时排队等待或使用备用连接', async () => {
      const poolConfig = {
        max: 5,
        min: 2,
        acquireTimeoutMillis: 3000,
        idleTimeoutMillis: 30000
      };

      await connectionPool.initialize(poolConfig);

      const connections = [];
      for (let i = 0; i < poolConfig.max; i++) {
        connections.push(await connectionPool.acquire());
      }

      expect(connections.length).toBe(poolConfig.max);

      const acquireStartTime = Date.now();
      const queuedConnection = await connectionPool.acquireWithQueue({
        timeout: 5000,
        priority: 'normal'
      });
      const acquireEndTime = Date.now();

      expect(queuedConnection).toBeDefined();
      expect(acquireEndTime - acquireStartTime).toBeGreaterThan(1000);

      await connectionPool.release(connections[0]);
      await connectionPool.release(queuedConnection);

      for (let i = 1; i < connections.length; i++) {
        await connectionPool.release(connections[i]);
      }
    });

    it('应该实施连接健康检查和自动恢复', async () => {
      await connectionPool.initialize({
        max: 3,
        min: 1,
        healthCheckInterval: 1000
      });

      const connections = await Promise.all([
        connectionPool.acquire(),
        connectionPool.acquire(),
        connectionPool.acquire()
      ]);

      connections[0].healthy = false;
      connections[1].healthy = false;

      const healthCheckResult = await connectionPool.performHealthCheck();
      expect(healthCheckResult.healthyConnections).toBe(1);
      expect(healthCheckResult.recoveredConnections).toBe(2);
      expect(healthCheckResult.totalConnections).toBe(3);

      await connectionPool.release(connections[2]);
    });

    it('应该在连接压力下动态调整池大小', async () => {
      const dynamicPool = connectionPool.createDynamicPool({
        initialSize: 3,
        maxSize: 10,
        scalingThreshold: 0.8
      });

      const concurrentRequests = Array.from({ length: 8 }, (_, i) =>
        dynamicPool.execute(async (conn) => {
          await setTimeout(500);
          return { requestId: i, connectionId: conn.id };
        })
      );

      const results = await Promise.all(concurrentRequests);
      expect(results.length).toBe(8);

      const poolMetrics = dynamicPool.getMetrics();
      expect(poolMetrics.currentSize).toBeGreaterThan(3);
      expect(poolMetrics.peakSize).toBeGreaterThanOrEqual(8);
      expect(poolMetrics.scaleUpEvents).toBeGreaterThan(0);

      await dynamicPool.shutdown();
    });
  });

  describe('磁盘空间不足处理', () => {
    it('应该在磁盘空间不足时清理临时文件', async () => {
      const diskMonitorSpy = jest.spyOn(resourceManager, 'monitorDiskSpace');

      diskMonitorSpy.mockResolvedValue({
        total: 100 * 1024 * 1024 * 1024,
        used: 95 * 1024 * 1024 * 1024,
        available: 5 * 1024 * 1024 * 1024,
        usagePercentage: 95,
        critical: true
      });

      const cleanupSpy = jest.spyOn(resourceManager, 'performDiskCleanup');
      cleanupSpy.mockResolvedValue({
        freedSpace: 2 * 1024 * 1024 * 1024,
        deletedFiles: 150,
        cleanedDirectories: ['/tmp', '/var/cache']
      });

      const diskSpaceManagement = await resourceManager.handleDiskSpacePressure({
        threshold: 90,
        action: 'cleanup'
      });

      expect(diskSpaceManagement.cleanupTriggered).toBe(true);
      expect(diskSpaceManagement.freedSpace).toBe(2 * 1024 * 1024 * 1024);
      expect(cleanupSpy).toHaveBeenCalledWith({
        target: '/tmp',
        maxAge: 86400000,
        minFreeSpace: 10 * 1024 * 1024 * 1024
      });

      diskMonitorSpy.mockRestore();
      cleanupSpy.mockRestore();
    });

    it('应该实施数据压缩和归档策略', async () => {
      const compressionSpy = jest.spyOn(resourceManager, 'compressOldData');
      compressionSpy.mockResolvedValue({
        originalSize: 10 * 1024 * 1024 * 1024,
        compressedSize: 2 * 1024 * 1024 * 1024,
        compressionRatio: 0.2,
        filesProcessed: 100,
        archivedFiles: 80
      });

      const archiveStrategy = await resourceManager.executeArchiveStrategy({
        dataAgeThreshold: 30 * 24 * 60 * 60 * 1000,
        compressionLevel: 6,
        archiveLocation: '/archive/data'
      });

      expect(archiveStrategy.success).toBe(true);
      expect(archiveStrategy.spaceSaved).toBe(8 * 1024 * 1024 * 1024);
      expect(archiveStrategy.compressionRatio).toBe(0.2);

      compressionSpy.mockRestore();
    });

    it('应该在磁盘完全不可用时优雅切换到内存模式', async () => {
      const diskFailureSpy = jest.spyOn(resourceManager, 'checkDiskHealth');
      diskFailureSpy.mockRejectedValue(new Error('Disk not accessible'));

      const memoryModeSpy = jest.spyOn(resourceManager, 'enableMemoryOnlyMode');
      memoryModeSpy.mockResolvedValue({
        mode: 'memory_only',
        maxMemoryUsage: 512 * 1024 * 1024,
        persistenceDisabled: true
      });

      const taskExecution = await resourceManager.executeWithDiskFallback(
        async () => {
          return await crawlerService.fetchSearchResults('disk_failure_test');
        },
        {
          fallbackToMemory: true,
          memoryLimit: 512 * 1024 * 1024
        }
      );

      expect(taskExecution.success).toBe(true);
      expect(taskExecution.mode).toBe('memory_only');
      expect(memoryModeSpy).toHaveBeenCalled();

      diskFailureSpy.mockRestore();
      memoryModeSpy.mockRestore();
    });
  });

  describe('高并发负载测试', () => {
    it('应该在极高并发下保持系统稳定性', async () => {
      const concurrentUsers = 100;
      const requestsPerUser = 10;

      const loadTest = async () => {
        const userPromises = Array.from({ length: concurrentUsers }, async (_, userId) => {
          const userRequests = Array.from({ length: requestsPerUser }, async (_, requestId) => {
            const startTime = Date.now();
            try {
              const result = await crawlerService.fetchSearchResults(`user_${userId}_query_${requestId}`);
              return {
                userId,
                requestId,
                success: true,
                responseTime: Date.now() - startTime,
                result: result
              };
            } catch (error) {
              return {
                userId,
                requestId,
                success: false,
                responseTime: Date.now() - startTime,
                error: error.message
              };
            }
          });
          return Promise.all(userRequests);
        });

        const startTime = Date.now();
        const results = await Promise.all(userPromises);
        const endTime = Date.now();

        return {
          totalRequests: concurrentUsers * requestsPerUser,
          totalTime: endTime - startTime,
          results: results.flat(),
          requestsPerSecond: (concurrentUsers * requestsPerUser) / ((endTime - startTime) / 1000)
        };
      };

      const testResult = await resourceManager.executeWithLoadBalancing(loadTest, {
        maxConcurrentConnections: 50,
        rateLimitPerSecond: 100,
        enableCircuitBreaker: true
      });

      const successRate = testResult.results.filter(r => r.success).length / testResult.totalRequests;
      const avgResponseTime = testResult.results.reduce((sum, r) => sum + r.responseTime, 0) / testResult.results.length;

      expect(successRate).toBeGreaterThan(0.95);
      expect(avgResponseTime).toBeLessThan(5000);
      expect(testResult.requestsPerSecond).toBeGreaterThan(50);
    });

    it('应该实现熔断器模式防止系统过载', async => => {
      const circuitBreaker = resourceManager.createCircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 10000,
        monitoringPeriod: 30000
      });

      const failingService = jest.fn()
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({ data: 'success' });

      const results = [];
      for (let i = 0; i < 10; i++) {
        try {
          const result = await circuitBreaker.execute(failingService);
          results.push({ attempt: i, success: true, result });
        } catch (error) {
          results.push({ attempt: i, success: false, error: error.message });
        }
        await setTimeout(100);
      }

      expect(results.filter(r => r.success).length).toBeLessThan(6);
      expect(circuitBreaker.getState()).toBe('open');
      expect(circuitBreaker.getFailureCount()).toBeGreaterThanOrEqual(5);
    });

    it('应该实施背压控制防止生产者过快', async () => {
      const producer = resourceManager.createControlledProducer({
        maxBuffer: 100,
        backpressureThreshold: 80,
        strategy: 'drop_oldest'
      });

      const consumerPromises = Array.from({ length: 5 }, async (_, i) => {
        const consumed = [];
        for await (const item of producer.createConsumer(i)) {
          consumed.push(item);
          await setTimeout(50);
          if (consumed.length >= 20) break;
        }
        return consumed;
      });

      const producerTask = async () => {
        for (let i = 0; i < 200; i++) {
          const produced = await producer.produce({
            id: i,
            data: `item_${i}`,
            timestamp: Date.now()
          });
          if (!produced) {
            await setTimeout(10);
          }
        }
        await producer.finish();
      };

      const [consumerResults] = await Promise.all([
        Promise.all(consumerPromises),
        producerTask()
      ]);

      const totalConsumed = consumerResults.reduce((sum, consumer) => sum + consumer.length, 0);
      expect(totalConsumed).toBeLessThan(200);
      expect(totalConsumed).toBeGreaterThan(50);

      const metrics = producer.getMetrics();
      expect(metrics.droppedItems).toBeGreaterThan(0);
      expect(metrics.backpressureEvents).toBeGreaterThan(0);
    });
  });
});