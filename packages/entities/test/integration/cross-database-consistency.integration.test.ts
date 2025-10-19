import { DataSource } from 'typeorm';
import { MongoClient, Db, Collection } from 'mongodb';
import Redis from 'ioredis';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WeiboAccountEntity, WeiboSearchTaskEntity, UserEntity } from '../../src/index.js';
import { WeiboAccountStatus, WeiboSearchTaskStatus } from '@pro/types';

/**
 * 跨数据库一致性测试
 * 测试PostgreSQL、MongoDB和Redis之间的数据同步和一致性
 */
describe('CrossDatabaseConsistencyTest', () => {
  // PostgreSQL配置
  let postgresDataSource: DataSource;
  let userRepository: any;
  let weiboAccountRepository: any;
  let searchTaskRepository: any;

  // MongoDB配置
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let mongoDb: Db;
  let rawCollection: Collection;
  let processedCollection: Collection;

  // Redis配置
  let redis: Redis;

  beforeAll(async () => {
    // 初始化PostgreSQL
    const postgresConfig = {
      type: 'postgres' as const,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'test',
      password: process.env.POSTGRES_PASSWORD || 'test',
      database: process.env.POSTGRES_DB || 'test_pro_consistency',
      entities: [UserEntity, WeiboAccountEntity, WeiboSearchTaskEntity],
      synchronize: true,
      logging: false,
    };

    postgresDataSource = new DataSource(postgresConfig);
    await postgresDataSource.initialize();

    userRepository = postgresDataSource.getRepository(UserEntity);
    weiboAccountRepository = postgresDataSource.getRepository(WeiboAccountEntity);
    searchTaskRepository = postgresDataSource.getRepository(WeiboSearchTaskEntity);

    // 初始化MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();

    mongoDb = mongoClient.db('test_pro_consistency');
    rawCollection = mongoDb.collection('raw_data');
    processedCollection = mongoDb.collection('processed_data');

    // 创建MongoDB索引
    await rawCollection.createIndexes([
      { key: { platformId: 1, dataType: 1 }, unique: true },
      { key: { taskId: 1 } },
      { key: { processedAt: 1 } },
    ]);

    await processedCollection.createIndexes([
      { key: { entityId: 1, entityType: 1 }, unique: true },
      { key: { lastSync: 1 } },
    ]);

    // 初始化Redis
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 3, // 使用专门的测试数据库
    });

    await redis.ping();
  });

  afterAll(async () => {
    // 清理资源
    if (postgresDataSource) {
      await postgresDataSource.destroy();
    }
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // 清理所有数据库的测试数据
    await postgresDataSource.query('TRUNCATE TABLE weibo_search_tasks CASCADE');
    await postgresDataSource.query('TRUNCATE TABLE weibo_accounts CASCADE');
    await postgresDataSource.query('TRUNCATE TABLE users CASCADE');

    await rawCollection.deleteMany({});
    await processedCollection.deleteMany({});
    await redis.flushdb();
  });

  describe('PostgreSQL和MongoDB数据同步', () => {
    test('应该同步微博搜索任务和原始数据', async () => {
      // 1. 在PostgreSQL中创建搜索任务
      const user = await userRepository.save({
        email: 'sync-test@example.com',
        password: 'hashedpassword',
        name: '同步测试用户',
      });

      const account = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: 'sync_test_uid',
        cookies: JSON.stringify({ session: 'test_session' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      const searchTask = await searchTaskRepository.save({
        keyword: '同步测试关键词',
        startDate: new Date('2024-01-01'),
        weiboAccountId: account.id,
        status: WeiboSearchTaskStatus.RUNNING,
        currentCrawlTime: new Date('2024-01-15'),
      });

      // 2. 在MongoDB中存储对应的原始数据
      const rawData = {
        platformId: `task_${searchTask.id}_data_1`,
        dataType: 'post',
        taskId: searchTask.id.toString(),
        crawledAt: new Date(),
        rawContent: {
          text: '同步测试的微博内容',
          user: { name: '测试微博用户' },
          createdAt: '2024-01-15 10:30:00',
        },
        processed: false,
      };

      await rawCollection.insertOne(rawData);

      // 3. 验证数据关联一致性
      const rawRecords = await rawCollection.find({
        taskId: searchTask.id.toString(),
      }).toArray();

      expect(rawRecords).toHaveLength(1);
      expect(rawRecords[0].platformId).toContain(searchTask.id.toString());

      // 4. 模拟数据处理完成，更新状态
      const processedData = {
        entityId: searchTask.id,
        entityType: 'weibo_search_task',
        rawDataId: rawRecords[0]._id,
        processedContent: {
          cleanText: '同步测试的微博内容',
          entities: ['测试', '微博', '用户'],
          sentiment: 'neutral',
        },
        processedAt: new Date(),
        lastSync: new Date(),
      };

      await processedCollection.insertOne(processedData);

      // 5. 在Redis中缓存处理状态
      const cacheKey = `task:${searchTask.id}:status`;
      await redis.set(cacheKey, JSON.stringify({
        taskId: searchTask.id,
        status: 'processed',
        recordCount: 1,
        lastProcessed: new Date().toISOString(),
      }));

      // 6. 验证跨数据库一致性
      const cachedStatus = JSON.parse(await redis.get(cacheKey)!);
      expect(cachedStatus.taskId).toBe(searchTask.id);
      expect(cachedStatus.status).toBe('processed');

      const processedRecord = await processedCollection.findOne({
        entityId: searchTask.id,
      });
      expect(processedRecord).toBeDefined();
      expect(processedRecord.processedContent.cleanText).toBe('同步测试的微博内容');
    });

    test('应该处理数据同步失败的一致性', async () => {
      // 创建搜索任务
      const user = await userRepository.save({
        email: 'fail-sync@example.com',
        password: 'hashedpassword',
        name: '失败同步测试',
      });

      const searchTask = await searchTaskRepository.save({
        keyword: '失败测试关键词',
        startDate: new Date('2024-01-01'),
        userId: user.id,
        status: WeiboSearchTaskStatus.RUNNING,
      });

      // 在MongoDB中插入原始数据
      const rawRecord = {
        platformId: `task_${searchTask.id}_fail_data`,
        dataType: 'post',
        taskId: searchTask.id.toString(),
        crawledAt: new Date(),
        rawContent: { text: '失败测试数据' },
        processed: false,
        syncAttempts: 0,
      };

      await rawCollection.insertOne(rawRecord);

      // 模拟同步失败
      await rawCollection.updateOne(
        { _id: rawRecord._id },
        {
          $inc: { syncAttempts: 1 },
          $set: { lastSyncError: 'Connection timeout', lastSyncAttempt: new Date() },
        }
      );

      // 在Redis中记录失败状态
      const failKey = `sync:fail:${searchTask.id}`;
      await redis.setex(failKey, 300, JSON.stringify({
        taskId: searchTask.id,
        error: 'Connection timeout',
        attempts: 1,
        timestamp: new Date().toISOString(),
      }));

      // 验证失败状态被正确记录
      const failedRecord = await rawCollection.findOne({ _id: rawRecord._id });
      expect(failedRecord.syncAttempts).toBe(1);
      expect(failedRecord.lastSyncError).toBe('Connection timeout');

      const failStatus = JSON.parse(await redis.get(failKey)!);
      expect(failStatus.error).toBe('Connection timeout');
      expect(failStatus.attempts).toBe(1);

      // 在PostgreSQL中更新任务状态为失败
      await searchTaskRepository.save({
        ...searchTask,
        status: WeiboSearchTaskStatus.FAILED,
        errorMessage: '数据同步失败',
        retryCount: 1,
      });

      const failedTask = await searchTaskRepository.findOne({
        where: { id: searchTask.id },
      });
      expect(failedTask.status).toBe(WeiboSearchTaskStatus.FAILED);
      expect(failedTask.errorMessage).toBe('数据同步失败');
    });

    test('应该支持增量数据同步', async () => {
      // 创建基础任务
      const searchTask = await searchTaskRepository.save({
        keyword: '增量同步测试',
        startDate: new Date('2024-01-01'),
        status: WeiboSearchTaskStatus.RUNNING,
        currentCrawlTime: new Date('2024-01-10'),
      });

      // 第一批数据
      const batch1 = [
        {
          platformId: `task_${searchTask.id}_batch1_1`,
          dataType: 'post',
          taskId: searchTask.id.toString(),
          crawledAt: new Date('2024-01-10T10:00:00Z'),
          rawContent: { text: '第一批数据1' },
        },
        {
          platformId: `task_${searchTask.id}_batch1_2`,
          dataType: 'post',
          taskId: searchTask.id.toString(),
          crawledAt: new Date('2024-01-10T10:01:00Z'),
          rawContent: { text: '第一批数据2' },
        },
      ];

      await rawCollection.insertMany(batch1);

      // 设置同步检查点
      const checkpointKey = `sync:checkpoint:${searchTask.id}`;
      await redis.set(checkpointKey, JSON.stringify({
        taskId: searchTask.id,
        lastSyncTime: '2024-01-10T10:01:00Z',
        syncedCount: 2,
      }));

      // 第二批数据（模拟新的抓取数据）
      const batch2 = [
        {
          platformId: `task_${searchTask.id}_batch2_1`,
          dataType: 'post',
          taskId: searchTask.id.toString(),
          crawledAt: new Date('2024-01-10T11:00:00Z'),
          rawContent: { text: '第二批数据1' },
        },
        {
          platformId: `task_${searchTask.id}_batch2_2`,
          dataType: 'post',
          taskId: searchTask.id.toString(),
          crawledAt: new Date('2024-01-10T11:01:00Z'),
          rawContent: { text: '第二批数据2' },
        },
      ];

      await rawCollection.insertMany(batch2);

      // 获取增量数据
      const checkpoint = JSON.parse(await redis.get(checkpointKey)!);
      const incrementalData = await rawCollection.find({
        taskId: searchTask.id.toString(),
        crawledAt: { $gt: new Date(checkpoint.lastSyncTime) },
      }).toArray();

      expect(incrementalData).toHaveLength(2);
      expect(incrementalData[0].rawContent.text).toContain('第二批数据');

      // 更新检查点
      const newCheckpoint = {
        taskId: searchTask.id,
        lastSyncTime: '2024-01-10T11:01:00Z',
        syncedCount: 4,
      };
      await redis.set(checkpointKey, JSON.stringify(newCheckpoint));

      // 验证检查点更新
      const updatedCheckpoint = JSON.parse(await redis.get(checkpointKey)!);
      expect(updatedCheckpoint.syncedCount).toBe(4);
      expect(updatedCheckpoint.lastSyncTime).toBe('2024-01-10T11:01:00Z');
    });
  });

  describe('事务一致性验证', () => {
    test('应该保证跨数据库事务的一致性', async () => {
      // 创建分布式事务ID
      const transactionId = `tx_${Date.now()}`;

      // 1. 在PostgreSQL中开始事务
      await postgresDataSource.transaction(async (manager) => {
        // 创建用户
        const user = await manager.save(UserEntity, {
          email: `tx_${transactionId}@example.com`,
          password: 'hashedpassword',
          name: '事务测试用户',
        });

        // 创建微博账号
        const account = await manager.save(WeiboAccountEntity, {
          userId: user.id,
          weiboUid: `tx_${transactionId}_uid`,
          cookies: JSON.stringify({ session: 'test_session' }),
          status: WeiboAccountStatus.ACTIVE,
        });

        // 创建搜索任务
        const task = await manager.save(WeiboSearchTaskEntity, {
          keyword: `事务测试_${transactionId}`,
          startDate: new Date(),
          weiboAccountId: account.id,
          status: WeiboSearchTaskStatus.PENDING,
        });

        // 2. 在Redis中记录事务状态
        const txStatusKey = `transaction:${transactionId}`;
        await redis.setex(txStatusKey, 3600, JSON.stringify({
          transactionId,
          status: 'pending',
          entities: {
            user: user.id,
            account: account.id,
            task: task.id,
          },
          timestamp: new Date().toISOString(),
        }));

        // 3. 在MongoDB中准备相关数据（但不提交）
        const preparedData = {
          _id: transactionId,
          transactionId,
          status: 'prepared',
          entities: {
            userId: user.id,
            accountId: account.id,
            taskId: task.id,
          },
          data: {
            taskKeyword: `事务测试_${transactionId}`,
            weiboUid: `tx_${transactionId}_uid`,
          },
          createdAt: new Date(),
        };

        await mongoDb.collection('prepared_transactions').insertOne(preparedData);

        // 4. 模拟事务提交
        await redis.setex(txStatusKey, 3600, JSON.stringify({
          transactionId,
          status: 'committed',
          entities: {
            user: user.id,
            account: account.id,
            task: task.id,
          },
          timestamp: new Date().toISOString(),
        }));

        await mongoDb.collection('prepared_transactions').updateOne(
          { _id: transactionId },
          { $set: { status: 'committed', committedAt: new Date() } }
        );
      });

      // 5. 验证事务一致性
      // 检查PostgreSQL数据
      const users = await userRepository.find({
        where: { email: `tx_${transactionId}@example.com` },
      });
      expect(users).toHaveLength(1);

      const accounts = await weiboAccountRepository.find({
        where: { weiboUid: `tx_${transactionId}_uid` },
      });
      expect(accounts).toHaveLength(1);

      const tasks = await searchTaskRepository.find({
        where: { keyword: `事务测试_${transactionId}` },
      });
      expect(tasks).toHaveLength(1);

      // 检查Redis事务状态
      const txStatus = JSON.parse(await redis.get(`transaction:${transactionId}`)!);
      expect(txStatus.status).toBe('committed');
      expect(txStatus.entities.user).toBe(users[0].id);

      // 检查MongoDB事务记录
      const txRecord = await mongoDb.collection('prepared_transactions').findOne({
        _id: transactionId,
      });
      expect(txRecord.status).toBe('committed');
    });

    test('应该处理事务回滚的一致性', async () => {
      const transactionId = `rollback_tx_${Date.now()}`;

      try {
        await postgresDataSource.transaction(async (manager) => {
          // 创建用户
          const user = await manager.save(UserEntity, {
            email: `rollback_${transactionId}@example.com`,
            password: 'hashedpassword',
            name: '回滚测试用户',
          });

          // 在Redis中设置事务状态
          const txStatusKey = `transaction:${transactionId}`;
          await redis.set(txStatusKey, JSON.stringify({
            transactionId,
            status: 'pending',
            userId: user.id,
          }));

          // 在MongoDB中准备数据
          await mongoDb.collection('prepared_transactions').insertOne({
            _id: transactionId,
            status: 'prepared',
            userId: user.id,
          });

          // 模拟事务失败
          throw new Error('模拟事务失败');
        });
      } catch (error) {
        // 事务应该回滚
      }

      // 验证PostgreSQL数据被回滚
      const users = await userRepository.find({
        where: { email: `rollback_${transactionId}@example.com` },
      });
      expect(users).toHaveLength(0);

      // 清理Redis和MongoDB中的临时数据
      await redis.del(`transaction:${transactionId}`);
      await mongoDb.collection('prepared_transactions').deleteOne({
        _id: transactionId,
      });

      // 验证清理完成
      const txStatus = await redis.get(`transaction:${transactionId}`);
      expect(txStatus).toBe(null);

      const txRecord = await mongoDb.collection('prepared_transactions').findOne({
        _id: transactionId,
      });
      expect(txRecord).toBe(null);
    });
  });

  describe('数据完整性检查', () => {
    test('应该检测和修复数据不一致', async () => {
      // 1. 创建完整的测试数据
      const user = await userRepository.save({
        email: 'consistency@example.com',
        password: 'hashedpassword',
        name: '一致性测试用户',
      });

      const account = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: 'consistency_uid',
        cookies: JSON.stringify({ session: 'test' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      const task = await searchTaskRepository.save({
        keyword: '一致性测试',
        startDate: new Date(),
        weiboAccountId: account.id,
        status: WeiboSearchTaskStatus.RUNNING,
      });

      // 2. 在MongoDB中存储原始数据
      const rawRecord = {
        platformId: `consistency_task_${task.id}`,
        dataType: 'post',
        taskId: task.id.toString(),
        crawledAt: new Date(),
        rawContent: { text: '一致性测试数据' },
        metadata: {
          accountId: account.id,
          userId: user.id,
        },
      };

      await rawCollection.insertOne(rawRecord);

      // 3. 在Redis中缓存状态
      const cacheKey = `consistency:task:${task.id}`;
      await redis.set(cacheKey, JSON.stringify({
        taskId: task.id,
        status: 'running',
        accountId: account.id,
        userId: user.id,
        recordCount: 1,
      }));

      // 4. 执行一致性检查
      const consistencyReport = await performConsistencyCheck(
        task.id,
        userRepository,
        weiboAccountRepository,
        searchTaskRepository,
        rawCollection,
        redis
      );

      expect(consistencyReport.isConsistent).toBe(true);
      expect(consistencyReport.postgresRecordExists).toBe(true);
      expect(consistencyReport.mongoRecordExists).toBe(true);
      expect(consistencyReport.redisCacheExists).toBe(true);
      expect(consistencyReport.dataMatches).toBe(true);

      // 5. 模拟数据不一致（删除MongoDB记录）
      await rawCollection.deleteOne({ taskId: task.id.toString() });

      // 6. 再次检查一致性
      const inconsistencyReport = await performConsistencyCheck(
        task.id,
        userRepository,
        weiboAccountRepository,
        searchTaskRepository,
        rawCollection,
        redis
      );

      expect(inconsistencyReport.isConsistent).toBe(false);
      expect(inconsistencyReport.mongoRecordExists).toBe(false);
      expect(inconsistencyReport.issues).toContain('MongoDB record missing');

      // 7. 修复不一致
      await repairInconsistency(task.id, inconsistencyReport, {
        userRepository,
        weiboAccountRepository,
        searchTaskRepository,
        rawCollection,
        redis,
      });

      // 8. 验证修复结果
      const finalReport = await performConsistencyCheck(
        task.id,
        userRepository,
        weiboAccountRepository,
        searchTaskRepository,
        rawCollection,
        redis
      );

      expect(finalReport.isConsistent).toBe(true);
    });

    test('应该处理关联数据的完整性', async () => {
      // 创建复杂关联数据
      const user = await userRepository.save({
        email: 'relation@example.com',
        password: 'hashedpassword',
        name: '关联测试用户',
      });

      const account1 = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: 'relation_uid_1',
        cookies: JSON.stringify({ session: 'test1' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      const account2 = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: 'relation_uid_2',
        cookies: JSON.stringify({ session: 'test2' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      const task1 = await searchTaskRepository.save({
        keyword: '关联测试1',
        startDate: new Date(),
        weiboAccountId: account1.id,
        status: WeiboSearchTaskStatus.RUNNING,
      });

      const task2 = await searchTaskRepository.save({
        keyword: '关联测试2',
        startDate: new Date(),
        weiboAccountId: account2.id,
        status: WeiboSearchTaskStatus.RUNNING,
      });

      // 在MongoDB中创建对应数据
      await rawCollection.insertMany([
        {
          platformId: 'relation_data_1',
          taskId: task1.id.toString(),
          accountId: account1.id,
          userId: user.id,
          crawledAt: new Date(),
          rawContent: { text: '关联数据1' },
        },
        {
          platformId: 'relation_data_2',
          taskId: task2.id.toString(),
          accountId: account2.id,
          userId: user.id,
          crawledAt: new Date(),
          rawContent: { text: '关联数据2' },
        },
      ]);

      // 执行关联完整性检查
      const relationReport = await performRelationIntegrityCheck(
        user.id,
        { userRepository, weiboAccountRepository, searchTaskRepository, rawCollection }
      );

      expect(relationReport.isConsistent).toBe(true);
      expect(relationReport.userAccountCount).toBe(2);
      expect(relationReport.accountTaskCount).toBe(1); // 每个账号1个任务
      expect(relationReport.mongoRecordCount).toBe(2);

      // 模拟外键约束违反（删除用户但不删除关联数据）
      await userRepository.delete({ id: user.id });

      // 再次检查关联完整性
      const brokenRelationReport = await performRelationIntegrityCheck(
        user.id,
        { userRepository, weiboAccountRepository, searchTaskRepository, rawCollection }
      );

      expect(brokenRelationReport.isConsistent).toBe(false);
      expect(brokenRelationReport.issues).toContain('Orphaned accounts detected');
    });
  });

  describe('性能和扩展性测试', () => {
    test('应该高效处理大量数据的一致性检查', async () => {
      // 创建大量测试数据
      const users = [];
      const accounts = [];
      const tasks = [];
      const rawData = [];

      for (let i = 0; i < 100; i++) {
        const user = await userRepository.save({
          email: `perf_${i}@example.com`,
          password: 'hashedpassword',
          name: `性能测试用户${i}`,
        });
        users.push(user);

        const account = await weiboAccountRepository.save({
          userId: user.id,
          weiboUid: `perf_uid_${i}`,
          cookies: JSON.stringify({ session: `test_${i}` }),
          status: WeiboAccountStatus.ACTIVE,
        });
        accounts.push(account);

        const task = await searchTaskRepository.save({
          keyword: `性能测试关键词${i}`,
          startDate: new Date(),
          weiboAccountId: account.id,
          status: WeiboSearchTaskStatus.RUNNING,
        });
        tasks.push(task);

        rawData.push({
          platformId: `perf_data_${i}`,
          taskId: task.id.toString(),
          crawledAt: new Date(),
          rawContent: { text: `性能测试数据${i}` },
        });
      }

      await rawCollection.insertMany(rawData);

      // 批量设置Redis缓存
      const redisPipeline = redis.pipeline();
      tasks.forEach(task => {
        redisPipeline.set(`perf:task:${task.id}`, JSON.stringify({
          taskId: task.id,
          status: 'running',
        }));
      });
      await redisPipeline.exec();

      // 测试批量一致性检查性能
      const startTime = Date.now();
      const taskIds = tasks.map(task => task.id);
      const batchReport = await performBatchConsistencyCheck(taskIds, {
        userRepository,
        weiboAccountRepository,
        searchTaskRepository,
        rawCollection,
        redis,
      });
      const endTime = Date.now();

      expect(batchReport.totalChecked).toBe(100);
      expect(batchReport.consistentCount).toBe(100);
      expect(batchReport.inconsistentCount).toBe(0);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});

/**
 * 执行单个任务的一致性检查
 */
async function performConsistencyCheck(
  taskId: number,
  repositories: any,
  rawCollection: Collection,
  redis: Redis
) {
  const { searchTaskRepository, weiboAccountRepository, userRepository } = repositories;

  const report: any = {
    taskId,
    isConsistent: true,
    issues: [],
  };

  try {
    // 检查PostgreSQL记录
    const pgTask = await searchTaskRepository.findOne({
      where: { id: taskId },
      relations: ['weiboAccount', 'user'],
    });

    report.postgresRecordExists = !!pgTask;
    if (!pgTask) {
      report.isConsistent = false;
      report.issues.push('PostgreSQL task record missing');
    }

    // 检查MongoDB记录
    const mongoRecord = await rawCollection.findOne({
      taskId: taskId.toString(),
    });

    report.mongoRecordExists = !!mongoRecord;
    if (!mongoRecord) {
      report.isConsistent = false;
      report.issues.push('MongoDB record missing');
    }

    // 检查Redis缓存
    const cacheKey = `consistency:task:${taskId}`;
    const cacheData = await redis.get(cacheKey);
    const cacheRecord = cacheData ? JSON.parse(cacheData) : null;

    report.redisCacheExists = !!cacheRecord;
    if (!cacheRecord) {
      report.isConsistent = false;
      report.issues.push('Redis cache missing');
    }

    // 检查数据匹配性
    if (pgTask && mongoRecord && cacheRecord) {
      report.dataMatches = (
        pgTask.id === parseInt(cacheRecord.taskId) &&
        mongoRecord.taskId === taskId.toString() &&
        pgTask.weiboAccount.id === cacheRecord.accountId
      );

      if (!report.dataMatches) {
        report.isConsistent = false;
        report.issues.push('Data mismatch across databases');
      }
    }

  } catch (error) {
    report.isConsistent = false;
    report.issues.push(`Consistency check error: ${error.message}`);
  }

  return report;
}

/**
 * 修复数据不一致
 */
async function repairInconsistency(
  taskId: number,
  report: any,
  repositories: any
) {
  const { searchTaskRepository, weiboAccountRepository, rawCollection, redis } = repositories;

  try {
    // 根据报告中的问题进行修复
    if (report.issues.includes('MongoDB record missing')) {
      const pgTask = await searchTaskRepository.findOne({
        where: { id: taskId },
        relations: ['weiboAccount', 'user'],
      });

      if (pgTask) {
        await rawCollection.insertOne({
          platformId: `repaired_task_${taskId}`,
          taskId: taskId.toString(),
          accountId: pgTask.weiboAccount.id,
          userId: pgTask.user.id,
          crawledAt: new Date(),
          rawContent: { text: '修复的数据' },
          metadata: { repaired: true, repairedAt: new Date() },
        });
      }
    }

    if (report.issues.includes('Redis cache missing')) {
      const pgTask = await searchTaskRepository.findOne({
        where: { id: taskId },
        relations: ['weiboAccount', 'user'],
      });

      if (pgTask) {
        const cacheKey = `consistency:task:${taskId}`;
        await redis.set(cacheKey, JSON.stringify({
          taskId: taskId,
          status: pgTask.status,
          accountId: pgTask.weiboAccount.id,
          userId: pgTask.user.id,
          recordCount: 1,
          repaired: true,
        }));
      }
    }

  } catch (error) {
    throw new Error(`Repair failed: ${error.message}`);
  }
}

/**
 * 执行关联完整性检查
 */
async function performRelationIntegrityCheck(
  userId: string,
  repositories: any
) {
  const { userRepository, weiboAccountRepository, searchTaskRepository, rawCollection } = repositories;

  const report: any = {
    userId,
    isConsistent: true,
    issues: [],
  };

  try {
    // 检查用户是否存在
    const user = await userRepository.findOne({ where: { id: userId } });
    report.userExists = !!user;

    if (!user) {
      report.isConsistent = false;
      report.issues.push('User not found');
      return report;
    }

    // 检查用户的账号
    const accounts = await weiboAccountRepository.find({
      where: { userId },
    });
    report.userAccountCount = accounts.length;

    // 检查账号的任务
    let totalTasks = 0;
    for (const account of accounts) {
      const tasks = await searchTaskRepository.find({
        where: { weiboAccountId: account.id },
      });
      totalTasks += tasks.length;
    }
    report.accountTaskCount = totalTasks / accounts.length || 0;

    // 检查MongoDB中的相关记录
    const mongoRecords = await rawCollection.find({
      userId,
    }).toArray();
    report.mongoRecordCount = mongoRecords.length;

    // 检查孤立数据
    if (report.userAccountCount === 0 && report.mongoRecordCount > 0) {
      report.isConsistent = false;
      report.issues.push('Orphaned MongoDB records');
    }

  } catch (error) {
    report.isConsistent = false;
    report.issues.push(`Relation integrity check error: ${error.message}`);
  }

  return report;
}

/**
 * 执行批量一致性检查
 */
async function performBatchConsistencyCheck(
  taskIds: number[],
  repositories: any
) {
  const report: any = {
    totalChecked: taskIds.length,
    consistentCount: 0,
    inconsistentCount: 0,
    issues: [],
  };

  const results = await Promise.allSettled(
    taskIds.map(taskId =>
      performConsistencyCheck(taskId, repositories, repositories.rawCollection, repositories.redis)
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.isConsistent) {
        report.consistentCount++;
      } else {
        report.inconsistentCount++;
        report.issues.push(`Task ${taskIds[index]}: ${result.value.issues.join(', ')}`);
      }
    } else {
      report.inconsistentCount++;
      report.issues.push(`Task ${taskIds[index]}: Check failed - ${result.reason}`);
    }
  });

  return report;
}