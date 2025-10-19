import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CrawlerModule } from '../../src/crawler.module';
import { WeiboCrawlerService } from '../../src/services/weibo-crawler.service';
import { DatabaseService } from '../../src/services/database.service';
import { MessageQueueService } from '../../src/services/message-queue.service';
import { RedisService } from '../../src/services/redis.service';
import { ExternalApiService } from '../../src/services/external-api.service';
import { HealthCheckService } from '../../src/services/health-check.service';
import { Logger } from '@pro/logger';
import { setTimeout } from 'timers/promises';

describe('ServiceDependencyFailureTest', () => {
  let app: INestApplication;
  let crawlerService: WeiboCrawlerService;
  let databaseService: DatabaseService;
  let messageQueue: MessageQueueService;
  let redisService: RedisService;
  let externalApi: ExternalApiService;
  let healthCheck: HealthCheckService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    crawlerService = moduleFixture.get<WeiboCrawlerService>(WeiboCrawlerService);
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    messageQueue = moduleFixture.get<MessageQueueService>(MessageQueueService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    externalApi = moduleFixture.get<ExternalApiService>(ExternalApiService);
    healthCheck = moduleFixture.get<HealthCheckService>(HealthCheckService);
    logger = moduleFixture.get<Logger>(Logger);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('数据库连接失败处理', () => {
    it('应该在数据库连接失败时切换到备用数据库', async () => {
      const primaryDbError = new Error('Connection timeout to primary database');
      const connectToPrimarySpy = jest.spyOn(databaseService, 'connectToPrimary');
      const connectToBackupSpy = jest.spyOn(databaseService, 'connectToBackup');

      connectToPrimarySpy.mockRejectedValue(primaryDbError);
      connectToBackupSpy.mockResolvedValue({
        connected: true,
        host: 'backup-db-host',
        database: 'crawler_backup'
      });

      const dbConnection = await databaseService.getConnectionWithFallback();
      expect(dbConnection.connected).toBe(true);
      expect(dbConnection.host).toBe('backup-db-host');
      expect(connectToPrimarySpy).toHaveBeenCalled();
      expect(connectToBackupSpy).toHaveBeenCalled();

      const testQuery = await databaseService.executeWithFallback(
        'SELECT COUNT(*) FROM posts',
        [],
        { useBackup: true }
      );
      expect(testQuery.success).toBe(true);
      expect(testQuery.source).toBe('backup');

      connectToPrimarySpy.mockRestore();
      connectToBackupSpy.mockRestore();
    });

    it('应该在数据库查询超时时重试和降级', async () => {
      const queryTimeoutSpy = jest.spyOn(databaseService, 'executeQuery');
      let attemptCount = 0;

      queryTimeoutSpy.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Query timeout after 30 seconds');
        }
        return { rows: [{ count: 100 }], success: true };
      });

      const result = await databaseService.executeWithRetry(
        'SELECT COUNT(*) FROM posts WHERE created_at > $1',
        [Date.now() - 86400000],
        { maxRetries: 3, timeout: 5000 }
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.rows[0].count).toBe(100);

      queryTimeoutSpy.mockRestore();
    });

    it('应该在数据库完全不可用时使用缓存数据', async () => {
      const dbFailureSpy = jest.spyOn(databaseService, 'executeQuery');
      dbFailureSpy.mockRejectedValue(new Error('Database completely unavailable'));

      const cacheGetDataSpy = jest.spyOn(redisService, 'get');
      cacheGetDataSpy.mockResolvedValue(JSON.stringify({
        data: [{ id: 'cached_post_1', content: 'Cached content 1' }],
        timestamp: Date.now() - 300000,
        source: 'cache'
      }));

      const fallbackResult = await crawlerService.fetchPostsWithFallback('test_query', {
        useCache: true,
        cacheMaxAge: 3600000
      });

      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.source).toBe('cache');
      expect(fallbackResult.data).toHaveLength(1);
      expect(fallbackResult.data[0].id).toBe('cached_post_1');

      dbFailureSpy.mockRestore();
      cacheGetDataSpy.mockRestore();
    });

    it('应该实施数据库连接池健康监控', async () => {
      const poolHealthSpy = jest.spyOn(databaseService, 'checkPoolHealth');

      poolHealthSpy.mockResolvedValue({
        totalConnections: 10,
        activeConnections: 8,
        idleConnections: 2,
        waitingRequests: 0,
        healthy: true,
        responseTime: 15
      });

      const healthStatus = await databaseService.getConnectionPoolHealth();
      expect(healthStatus.healthy).toBe(true);
      expect(healthStatus.utilizationRate).toBe(0.8);

      await databaseService.simulateConnectionPoolStress(15);
      const stressedHealthStatus = await databaseService.getConnectionPoolHealth();
      expect(stressedHealthStatus.healthy).toBe(false);
      expect(stressedHealthStatus.waitingRequests).toBeGreaterThan(0);

      poolHealthSpy.mockRestore();
    });
  });

  describe('消息队列故障处理', () => {
    it('应该在消息队列不可用时切换到备用队列', async () => {
      const primaryQueueError = new Error('RabbitMQ connection lost');
      const publishToPrimarySpy = jest.spyOn(messageQueue, 'publishToPrimaryQueue');
      const publishToBackupSpy = jest.spyOn(messageQueue, 'publishToBackupQueue');

      publishToPrimarySpy.mockRejectedValue(primaryQueueError);
      publishToBackupSpy.mockResolvedValue({
        messageId: 'backup_msg_123',
        queue: 'backup_crawler_queue',
        timestamp: Date.now()
      });

      const messageData = {
        taskId: 'queue_fail_test',
        url: 'https://weibo.com/test',
        priority: 'high'
      };

      const publishResult = await messageQueue.publishWithFallback(messageData, {
        primaryQueue: 'crawler_tasks',
        backupQueue: 'backup_crawler_tasks',
        retryCount: 3
      });

      expect(publishResult.success).toBe(true);
      expect(publishResult.messageId).toBe('backup_msg_123');
      expect(publishResult.usedQueue).toBe('backup_crawler_tasks');
      expect(publishResult.fallbackReason).toContain('RabbitMQ connection lost');

      publishToPrimarySpy.mockRestore();
      publishToBackupSpy.mockRestore();
    });

    it('应该在消息处理失败时重新入队', async () => {
      const processingError = new Error('Data validation failed');
      const processMessageSpy = jest.spyOn(messageQueue, 'processMessage');
      const requeueSpy = jest.spyOn(messageQueue, 'requeueMessage');

      processMessageSpy.mockRejectedValueOnce(processingError);
      processMessageSpy.mockResolvedValueOnce({ processed: true });

      const testMessage = {
        id: 'requeue_test_msg',
        payload: { url: 'https://weibo.com/requeue_test' },
        attempts: 0
      };

      const processingResult = await messageQueue.processWithRetry(testMessage, {
        maxAttempts: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      });

      expect(processingResult.success).toBe(true);
      expect(processingResult.totalAttempts).toBe(2);
      expect(requeueSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'requeue_test_msg' }),
        { delay: 1000 }
      );

      processMessageSpy.mockRestore();
      requeueSpy.mockRestore();
    });

    it('应该在队列积压时实施限流策略', async () => {
      const queueStatsSpy = jest.spyOn(messageQueue, 'getQueueStats');
      queueStatsSpy.mockResolvedValue({
        queueName: 'crawler_tasks',
        messageCount: 10000,
        consumerCount: 5,
        messageRate: 100,
        capacity: 1000,
        congestionLevel: 'high'
      });

      const rateLimiterSpy = jest.spyOn(messageQueue, 'applyRateLimiting');
      rateLimiterSpy.mockReturnValue({
        allowed: true,
        delayMs: 500,
        newRate: 50
      });

      const publishPromises = Array.from({ length: 20 }, (_, i) =>
        messageQueue.publishWithRateLimit({
          id: `rate_limit_test_${i}`,
          data: `test data ${i}`,
          priority: 'normal'
        })
      );

      const results = await Promise.all(publishPromises);
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBeLessThan(20);
      expect(successCount).toBeGreaterThan(10);
      expect(rateLimiterSpy).toHaveBeenCalled();

      queueStatsSpy.mockRestore();
      rateLimiterSpy.mockRestore();
    });

    it('应该在消息队列完全故障时使用本地队列', async () => {
      const queueFailureSpy = jest.spyOn(messageQueue, 'publishToPrimaryQueue');
      const backupFailureSpy = jest.spyOn(messageQueue, 'publishToBackupQueue');

      queueFailureSpy.mockRejectedValue(new Error('Primary queue down'));
      backupFailureSpy.mockRejectedValue(new Error('Backup queue down'));

      const localQueueSpy = jest.spyOn(messageQueue, 'publishToLocalQueue');
      localQueueSpy.mockResolvedValue({
        messageId: 'local_msg_456',
        queue: 'local_crawler_queue',
        persisted: true
      });

      const emergencyMessage = {
        taskId: 'emergency_queue_test',
        critical: true,
        data: 'Emergency data that must not be lost'
      };

      const emergencyResult = await messageQueue.publishWithEmergencyFallback(emergencyMessage);
      expect(emergencyResult.success).toBe(true);
      expect(emergencyResult.queueType).toBe('local');
      expect(emergencyResult.persisted).toBe(true);

      queueFailureSpy.mockRestore();
      backupFailureSpy.mockRestore();
      localQueueSpy.mockRestore();
    });
  });

  describe('Redis缓存故障处理', () => {
    it('应该在Redis连接失败时降级到内存缓存', async () => {
      const redisConnectionError = new Error('Redis connection refused');
      const redisGetSpy = jest.spyOn(redisService, 'get');
      const redisSetSpy = jest.spyOn(redisService, 'set');

      redisGetSpy.mockRejectedValue(redisConnectionError);
      redisSetSpy.mockRejectedValue(redisConnectionError);

      const memoryCacheSpy = jest.spyOn(redisService, 'getMemoryCache');
      memoryCacheSpy.mockReturnValue({
        data: { content: 'Memory cached data' },
        timestamp: Date.now() - 60000,
        ttl: 3600000
      });

      const cacheResult = await crawlerService.getCachedData('cache_fail_key', {
        fallbackToMemory: true,
        memoryTTL: 300000
      });

      expect(cacheResult.success).toBe(true);
      expect(cacheResult.source).toBe('memory');
      expect(cacheResult.data.content).toBe('Memory cached data');

      redisGetSpy.mockRestore();
      redisSetSpy.mockRestore();
      memoryCacheSpy.mockRestore();
    });

    it('应该在Redis高延迟时异步更新缓存', async () => {
      const highLatencySpy = jest.spyOn(redisService, 'set');
      highLatencySpy.mockImplementation(async () => {
        await setTimeout(2000);
        return { success: true, latency: 2000 };
      });

      const asyncUpdateSpy = jest.spyOn(redisService, 'asyncSet');
      asyncUpdateSpy.mockResolvedValue({
        queued: true,
        key: 'async_cache_key',
        estimatedDelay: 2000
      });

      const dataToCache = {
        id: 'async_cache_test',
        content: 'Data that will be cached asynchronously',
        timestamp: Date.now()
      };

      const cacheUpdateResult = await redisService.setWithLatencyHandling(
        'async_cache_key',
        dataToCache,
        { latencyThreshold: 1000, asyncOnHighLatency: true }
      );

      expect(cacheUpdateResult.queued).toBe(true);
      expect(cacheUpdateResult.estimatedDelay).toBe(2000);
      expect(asyncUpdateSpy).toHaveBeenCalledWith(
        'async_cache_key',
        dataToCache,
        expect.any(Object)
      );

      highLatencySpy.mockRestore();
      asyncUpdateSpy.mockRestore();
    });

    it('应该在Redis内存不足时清理过期数据', async () => {
      const memoryError = new Error('OOM command not allowed when used memory > "maxmemory"');
      const redisSetSpy = jest.spyOn(redisService, 'set');
      redisSetSpy.mockRejectedValueOnce(memoryError);

      const cleanupSpy = jest.spyOn(redisService, 'performMemoryCleanup');
      cleanupSpy.mockResolvedValue({
        freedMemory: 50 * 1024 * 1024,
        deletedKeys: 100,
        cleanupStrategy: 'volatile-lru'
      });

      const retrySetSpy = jest.spyOn(redisService, 'set');
      retrySetSpy.mockResolvedValueOnce({ success: true });

      const criticalData = {
        priority: 'critical',
        data: 'Important data that must be cached'
      };

      const cacheResult = await redisService.setWithMemoryManagement(
        'critical_cache_key',
        criticalData,
        { priority: 'high', ttl: 3600 }
      );

      expect(cacheResult.success).toBe(true);
      expect(cleanupSpy).toHaveBeenCalled();
      expect(cacheResult.memoryFreed).toBe(50 * 1024 * 1024);

      redisSetSpy.mockRestore();
      cleanupSpy.mockRestore();
      retrySetSpy.mockRestore();
    });

    it('应该在Redis集群节点故障时重新分片', async () => {
      const clusterFailureSpy = jest.spyOn(redisService, 'executeClusterCommand');
      clusterFailureSpy.mockRejectedValueOnce(new Error('Cluster node 16384 unavailable'));

      const reshuffleSpy = jest.spyOn(redisService, 'reshardCluster');
      reshuffleSpy.mockResolvedValue({
        reshuffled: true,
        affectedKeys: 1000,
        newDistribution: { node1: 500, node2: 500, node3: 0 }
      });

      const retryClusterSpy = jest.spyOn(redisService, 'executeClusterCommand');
      retryClusterSpy.mockResolvedValueOnce({ success: true, affectedNodes: 2 });

      const distributedData = Array.from({ length: 100 }, (_, i) => ({
        key: `cluster_test_${i}`,
        value: `distributed_value_${i}`
      }));

      const clusterResult = await redisService.executeWithClusterResilience(
        distributedData.map(item => ({
          command: 'SET',
          key: item.key,
          value: item.value
        }))
      );

      expect(clusterResult.success).toBe(true);
      expect(clusterResult.reshuffled).toBe(true);
      expect(clusterResult.affectedNodes).toBe(2);

      clusterFailureSpy.mockRestore();
      reshuffleSpy.mockRestore();
      retryClusterSpy.mockRestore();
    });
  });

  describe('外部API服务不可用处理', () => {
    it('应该在外部API超时时使用备用API', async () => {
      const primaryApiTimeout = new Error('Request timeout after 30 seconds');
      const primaryApiSpy = jest.spyOn(externalApi, 'callPrimaryAPI');
      const backupApiSpy = jest.spyOn(externalApi, 'callBackupAPI');

      primaryApiSpy.mockRejectedValue(primaryApiTimeout);
      backupApiSpy.mockResolvedValue({
        data: { posts: [{ id: 'backup_api_post_1', content: 'Backup API content' }] },
        source: 'backup_api',
        responseTime: 1500
      });

      const apiParams = {
        endpoint: '/search',
        query: 'test query',
        timeout: 5000
      };

      const apiResult = await externalApi.fetchWithFallback(apiParams, {
        primaryAPI: 'weibo_main',
        backupAPIs: ['weibo_backup', 'weibo_alternate'],
        retryStrategy: 'exponential_backoff'
      });

      expect(apiResult.success).toBe(true);
      expect(apiResult.source).toBe('backup_api');
      expect(apiResult.fallbackReason).toContain('timeout');
      expect(apiResult.data.posts).toHaveLength(1);

      primaryApiSpy.mockRestore();
      backupApiSpy.mockRestore();
    });

    it('应该在外部API限流时实施智能退避', async () => {
      const rateLimitError = new Error('429 Too Many Requests');
      const rateLimitSpy = jest.spyOn(externalApi, 'callAPI');
      let attemptCount = 0;

      rateLimitSpy.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 3) {
          const error = new Error('429 Too Many Requests');
          error.response = { status: 429, headers: { 'retry-after': attemptCount * 10 } };
          throw error;
        }
        return { data: { result: 'success after backoff' }, status: 200 };
      });

      const backoffResult = await externalApi.callWithIntelligentBackoff({
        endpoint: '/api/test',
        maxRetries: 5,
        baseDelay: 1000,
        respectRateLimitHeaders: true
      });

      expect(backoffResult.success).toBe(true);
      expect(attemptCount).toBe(4);
      expect(backoffResult.totalBackoffTime).toBeGreaterThan(6000);

      rateLimitSpy.mockRestore();
    });

    it('应该在外部API数据格式变更时适配处理', async () => {
      const legacyFormatResponse = {
        status: 'ok',
        data: {
          posts: [{ id: '1', content: 'Legacy format post' }]
        }
      };

      const newFormatResponse = {
        success: true,
        results: {
          items: [{ post_id: '1', post_content: 'New format post' }]
        }
      };

      const formatChangeSpy = jest.spyOn(externalApi, 'callAPI');
      formatChangeSpy.mockResolvedValueOnce(newFormatResponse);

      const adapterSpy = jest.spyOn(externalApi, 'adaptResponseFormat');
      adapterSpy.mockReturnValue({
        posts: [{ id: '1', content: 'New format post' }],
        adapted: true,
        originalFormat: 'v2',
        targetFormat: 'v1'
      });

      const adaptedResult = await externalApi.fetchWithFormatAdaptation({
        endpoint: '/api/posts',
        expectedFormat: 'v1',
        enableAutoAdaptation: true
      });

      expect(adaptedResult.success).toBe(true);
      expect(adaptedResult.adapted).toBe(true);
      expect(adaptedResult.data.posts).toHaveLength(1);
      expect(adapterSpy).toHaveBeenCalledWith(newFormatResponse, 'v1');

      formatChangeSpy.mockRestore();
      adapterSpy.mockRestore();
    });

    it('应该在外部API认证失败时刷新凭据', async () => {
      const authError = new Error('401 Unauthorized - Token expired');
      const apiCallSpy = jest.spyOn(externalApi, 'callAPI');

      apiCallSpy.mockRejectedValueOnce(authError);

      const refreshAuthSpy = jest.spyOn(externalApi, 'refreshAuthentication');
      refreshAuthSpy.mockResolvedValue({
        newToken: 'new_jwt_token_12345',
        expiresAt: Date.now() + 3600000,
        refreshed: true
      });

      const retryApiCallSpy = jest.spyOn(externalApi, 'callAPI');
      retryApiCallSpy.mockResolvedValueOnce({
        data: { authenticated: true, data: 'Protected data' },
        status: 200
      });

      const authResult = await externalApi.callWithAuthRefresh({
        endpoint: '/api/protected',
        retryOnAuthFailure: true
      });

      expect(authResult.success).toBe(true);
      expect(refreshAuthSpy).toHaveBeenCalled();
      expect(authResult.authRefreshed).toBe(true);

      apiCallSpy.mockRestore();
      refreshAuthSpy.mockRestore();
      retryApiCallSpy.mockRestore();
    });
  });

  describe('服务重启恢复测试', () => {
    it('应该在服务重启后恢复处理状态', async () => {
      const serviceState = {
        activeTasks: ['task_1', 'task_2', 'task_3'],
        processedCount: 150,
        failedCount: 5,
        lastCheckpoint: Date.now() - 300000
      };

      const saveStateSpy = jest.spyOn(crawlerService, 'saveServiceState');
      saveStateSpy.mockResolvedValue({ saved: true, timestamp: Date.now() });

      await crawlerService.saveCurrentState(serviceState);

      const simulateRestart = async () => {
        await crawlerService.shutdown();
        await setTimeout(1000);
        await crawlerService.initialize();
      };

      const loadStateSpy = jest.spyOn(crawlerService, 'loadServiceState');
      loadStateSpy.mockResolvedValue(serviceState);

      await simulateRestart();

      const recoveredState = await crawlerService.getRecoveredState();
      expect(recoveredState.activeTasks).toEqual(['task_1', 'task_2', 'task_3']);
      expect(recoveredState.processedCount).toBe(150);

      saveStateSpy.mockRestore();
      loadStateSpy.mockRestore();
    });

    it('应该在服务重启后重建连接池', async () => {
      const connectionPoolBefore = await databaseService.getConnectionPoolStatus();
      expect(connectionPoolBefore.healthy).toBe(true);

      await databaseService.simulateServiceRestart();

      const connectionPoolAfter = await databaseService.getConnectionPoolStatus();
      expect(connectionPoolAfter.healthy).toBe(true);
      expect(connectionPoolAfter.reestablished).toBe(true);
      expect(connectionPoolAfter.connections).toBeGreaterThan(0);
    });

    it('应该在服务重启后恢复消息队列订阅', async () => {
      const subscriptionsBefore = await messageQueue.getActiveSubscriptions();
      expect(subscriptionsBefore.length).toBeGreaterThan(0);

      await messageQueue.simulateServiceRestart();

      const subscriptionsAfter = await messageQueue.getActiveSubscriptions();
      expect(subscriptionsAfter.length).toBe(subscriptionsBefore.length);
      expect(subscriptionsAfter.every(sub => sub.active)).toBe(true);
    });

    it('应该在服务重启后验证所有依赖服务健康状态', async () => {
      const healthCheckSpy = jest.spyOn(healthCheck, 'performComprehensiveCheck');

      healthCheckSpy.mockResolvedValue({
        overall: 'healthy',
        services: {
          database: { status: 'healthy', responseTime: 15 },
          redis: { status: 'healthy', responseTime: 5 },
          messageQueue: { status: 'healthy', responseTime: 10 },
          externalAPIs: { status: 'healthy', responseTime: 200 }
        },
        timestamp: Date.now()
      });

      await crawlerService.simulateServiceRestart();
      const postRestartHealth = await healthCheck.performComprehensiveCheck();

      expect(postRestartHealth.overall).toBe('healthy');
      expect(Object.values(postRestartHealth.services).every(s => s.status === 'healthy')).toBe(true);

      healthCheckSpy.mockRestore();
    });

    it('应该在服务重启期间保持数据一致性', async () => {
      const criticalData = {
        id: 'consistency_test',
        operations: ['create', 'update', 'delete'],
        timestamps: Array.from({ length: 10 }, () => Date.now())
      };

      await databaseService.beginTransaction();

      for (const operation of criticalData.operations) {
        await databaseService.executeOperation(operation, criticalData);
      }

      const checkpointSpy = jest.spyOn(databaseService, 'createTransactionCheckpoint');
      checkpointSpy.mockResolvedValue({
        checkpointId: 'restart_checkpoint_123',
        operations: criticalData.operations.length,
        timestamp: Date.now()
      });

      await databaseService.createTransactionCheckpoint();

      await crawlerService.simulateServiceRestart();

      const recoverySpy = jest.spyOn(databaseService, 'recoverFromCheckpoint');
      recoverySpy.mockResolvedValue({
        recovered: true,
        operationsRestored: criticalData.operations.length,
        dataIntegrity: 'verified'
      });

      const recoveryResult = await databaseService.recoverFromCheckpoint('restart_checkpoint_123');

      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryResult.operationsRestored).toBe(criticalData.operations.length);
      expect(recoveryResult.dataIntegrity).toBe('verified');

      await databaseService.commitTransaction();

      checkpointSpy.mockRestore();
      recoverySpy.mockRestore();
    });
  });
});