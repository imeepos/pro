import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CrawlerModule } from '../../src/crawler.module';
import { WeiboCrawlerService } from '../../src/services/weibo-crawler.service';
import { NetworkService } from '../../src/services/network.service';
import { Logger } from '@pro/logger';
import { setTimeout } from 'timers/promises';

describe('NetworkFailureRecoveryTest', () => {
  let app: INestApplication;
  let crawlerService: WeiboCrawlerService;
  let networkService: NetworkService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    crawlerService = moduleFixture.get<WeiboCrawlerService>(WeiboCrawlerService);
    networkService = moduleFixture.get<NetworkService>(NetworkService);
    logger = moduleFixture.get<Logger>(Logger);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('网络连接中断模拟', () => {
    it('应该在网络中断后优雅降级', async () => {
      const originalConnect = networkService.createConnection;
      let connectionAttempts = 0;

      networkService.createConnection = jest.fn().mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts <= 3) {
          throw new Error('Network unreachable');
        }
        return originalConnect.call(networkService);
      });

      const taskId = await crawlerService.startCrawlingTask({
        platform: 'weibo',
        keywords: ['test'],
        maxResults: 10
      });

      await setTimeout(5000);

      const taskStatus = await crawlerService.getTaskStatus(taskId);
      expect(taskStatus.status).toBe('failed');
      expect(taskStatus.error).toContain('Network unreachable');

      networkService.createConnection = originalConnect;
    });

    it('应该记录网络故障详细信息', async () => {
      const logSpy = jest.spyOn(logger, 'error');

      networkService.simulateNetworkFailure('timeout');

      try {
        await crawlerService.fetchUserData('test_user');
      } catch (error) {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Network failure detected'),
          expect.objectContaining({
            error: expect.any(Error),
            timestamp: expect.any(Number),
            retryCount: expect.any(Number)
          })
        );
      }
    });
  });

  describe('自动重连机制验证', () => {
    it('应该实现指数退避重连策略', async () => {
      const reconnectAttempts: number[] = [];
      const originalConnect = networkService.createConnection;
      let attemptCount = 0;

      networkService.createConnection = jest.fn().mockImplementation(async () => {
        const attemptStart = Date.now();
        reconnectAttempts.push(attemptStart);
        attemptCount++;

        if (attemptCount < 4) {
          throw new Error('Connection failed');
        }

        return originalConnect.call(networkService);
      });

      const startTime = Date.now();
      const result = await networkService.connectWithRetry({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 10000
      });
      const endTime = Date.now();

      expect(result).toBeTruthy();
      expect(reconnectAttempts.length).toBe(4);

      for (let i = 1; i < reconnectAttempts.length; i++) {
        const delay = reconnectAttempts[i] - reconnectAttempts[i - 1];
        const expectedDelay = Math.min(1000 * Math.pow(2, i - 1), 10000);
        expect(delay).toBeGreaterThanOrEqual(expectedDelay * 0.8);
        expect(delay).toBeLessThanOrEqual(expectedDelay * 1.2);
      }

      networkService.createConnection = originalConnect;
    });

    it('应该在重试次数耗尽后停止重试', async () => {
      networkService.createConnection = jest.fn().mockRejectedValue(
        new Error('Persistent network failure')
      );

      const startTime = Date.now();
      await expect(networkService.connectWithRetry({
        maxRetries: 3,
        baseDelay: 500
      })).rejects.toThrow('Persistent network failure');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('断点续传功能测试', () => {
    it('应该从断点恢复爬取任务', async () => {
      const taskId = 'resume_test_task';
      const checkpointData = {
        lastProcessedId: '123456789',
        processedCount: 50,
        totalTarget: 100,
        timestamp: Date.now()
      };

      await crawlerService.saveTaskCheckpoint(taskId, checkpointData);

      networkService.simulateNetworkFailure('intermittent');

      const resumedTask = await crawlerService.resumeTaskFromCheckpoint(taskId);

      expect(resumedTask.id).toBe(taskId);
      expect(resumedTask.lastProcessedId).toBe(checkpointData.lastProcessedId);
      expect(resumedTask.progress).toBe(50);
    });

    it('应该定期保存检查点', async () => {
      const checkpointSpy = jest.spyOn(crawlerService, 'saveTaskCheckpoint');
      const taskId = await crawlerService.startCrawlingTask({
        platform: 'weibo',
        keywords: ['checkpoint_test'],
        maxResults: 30,
        checkpointInterval: 5
      });

      await setTimeout(8000);

      expect(checkpointSpy).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          processedCount: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );

      checkpointSpy.mockRestore();
    });

    it('应该在任务完成后清理检查点数据', async () => {
      const taskId = 'cleanup_test_task';
      await crawlerService.saveTaskCheckpoint(taskId, {
        processedCount: 10,
        lastProcessedId: 'test_id'
      });

      await crawlerService.completeTask(taskId);

      const checkpoint = await crawlerService.getTaskCheckpoint(taskId);
      expect(checkpoint).toBeNull();
    });
  });

  describe('超时处理验证', () => {
    it('应该在请求超时后优雅降级', async () => {
      const originalFetch = networkService.fetchWithTimeout;
      networkService.fetchWithTimeout = jest.fn().mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 1000);
        })
      );

      const startTime = Date.now();
      const result = await crawlerService.fetchWithFallback({
        url: 'https://weibo.com/api/test',
        timeout: 2000,
        fallbackUrls: [
          'https://weibo.com/api/test_backup',
          'https://weibo.com/api/test_final'
        ]
      });
      const endTime = Date.now();

      expect(result.status).toBe('timeout');
      expect(endTime - startTime).toBeLessThan(3000);

      networkService.fetchWithTimeout = originalFetch;
    });

    it('应该使用备用URL处理超时', async () => {
      let callCount = 0;
      const originalFetch = networkService.fetchWithTimeout;

      networkService.fetchWithTimeout = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 500);
          });
        }
        return Promise.resolve({ data: 'success', status: 200 });
      });

      const result = await crawlerService.fetchWithFallback({
        url: 'https://weibo.com/api/primary',
        timeout: 1000,
        fallbackUrls: [
          'https://weibo.com/api/backup1',
          'https://weibo.com/api/backup2'
        ]
      });

      expect(result.data).toBe('success');
      expect(callCount).toBe(3);

      networkService.fetchWithTimeout = originalFetch;
    });
  });

  describe('连接池恢复测试', () => {
    it('应该在连接池耗尽后自动重建', async () => {
      const poolSize = 5;
      const connections = [];

      for (let i = 0; i < poolSize; i++) {
        connections.push(await networkService.getConnection());
      }

      expect(connections.length).toBe(poolSize);

      for (const conn of connections) {
        await networkService.releaseConnection(conn);
      }

      const newConnection = await networkService.getConnection();
      expect(newConnection).toBeDefined();
      expect(newConnection.id).not.toBe(connections[0].id);

      await networkService.releaseConnection(newConnection);
    });

    it('应该检测和清理失效连接', async () => {
      const connections = await Promise.all([
        networkService.getConnection(),
        networkService.getConnection(),
        networkService.getConnection()
      ]);

      connections[0].isAlive = false;
      connections[1].isAlive = false;

      const healthCheck = await networkService.checkConnectionPoolHealth();
      expect(healthCheck.healthyConnections).toBe(1);
      expect(healthCheck.deadConnectionsReclaimed).toBe(2);

      const aliveConnection = connections.find(conn => conn.isAlive);
      await networkService.releaseConnection(aliveConnection);
    });

    it('应该在连接池压力下保持性能', async () => {
      const concurrentRequests = 20;
      const requestPromises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          networkService.executeWithConnection(async (conn) => {
            await setTimeout(100);
            return { requestId: i, connectionId: conn.id };
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(requestPromises);
      const endTime = Date.now();

      expect(results.length).toBe(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(3000);

      const connectionIds = new Set(results.map(r => r.connectionId));
      expect(connectionIds.size).toBeLessThanOrEqual(10);
    });
  });

  describe('网络质量监控', () => {
    it('应该监控网络延迟和丢包率', async () => {
      const metrics = await networkService.measureNetworkQuality({
        sampleCount: 10,
        interval: 100
      });

      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.packetLoss).toBeGreaterThanOrEqual(0);
      expect(metrics.packetLoss).toBeLessThanOrEqual(1);
      expect(metrics.jitter).toBeGreaterThan(0);
    });

    it('应该根据网络质量调整爬取策略', async () => {
      networkService.setNetworkQuality({
        latency: 5000,
        packetLoss: 0.1,
        bandwidth: 1000
      });

      const strategy = crawlerService.adaptCrawlingStrategy();
      expect(strategy.requestDelay).toBeGreaterThan(5000);
      expect(strategy.concurrentRequests).toBeLessThan(5);
      expect(strategy.retryAttempts).toBeGreaterThan(3);
    });
  });
});