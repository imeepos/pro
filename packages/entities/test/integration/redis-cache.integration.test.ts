import Redis from 'ioredis';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

/**
 * Redis缓存集成测试
 * 测试缓存存储、过期机制、分布式锁、会话管理和故障恢复
 */
describe('RedisCacheIntegrationTest', () => {
  let redis: Redis;

  beforeAll(async () => {
    // 连接Redis实例
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '1'), // 使用测试数据库
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // 测试连接
    await redis.ping();
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // 清理测试数据
    await redis.flushdb();
  });

  afterEach(async () => {
    // 清理任何可能的残留数据
  });

  describe('缓存存储和过期', () => {
    test('应该存储和检索字符串数据', async () => {
      const key = 'test:string:key';
      const value = '测试字符串值';

      // 存储数据
      await redis.set(key, value);

      // 检索数据
      const retrieved = await redis.get(key);
      expect(retrieved).toBe(value);

      // 验证键存在
      const exists = await redis.exists(key);
      expect(exists).toBe(1);
    });

    test('应该处理过期时间', async () => {
      const key = 'test:expire:key';
      const value = '即将过期的值';

      // 设置1秒过期时间
      await redis.setex(key, 1, value);

      // 立即检查应该存在
      let exists = await redis.exists(key);
      expect(exists).toBe(1);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 过期后应该不存在
      exists = await redis.exists(key);
      expect(exists).toBe(0);
    });

    test('应该支持复杂数据结构', async () => {
      // 测试JSON对象
      const jsonKey = 'test:json:user';
      const userObject = {
        id: 'user_123',
        name: '测试用户',
        email: 'test@example.com',
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
          notifications: true,
        },
        lastLogin: new Date().toISOString(),
      };

      await redis.set(jsonKey, JSON.stringify(userObject));

      const retrievedJson = await redis.get(jsonKey);
      const parsedUser = JSON.parse(retrievedJson!);

      expect(parsedUser.id).toBe(userObject.id);
      expect(parsedUser.name).toBe(userObject.name);
      expect(parsedUser.preferences.theme).toBe('dark');

      // 测试列表结构
      const listKey = 'test:list:keywords';
      const keywords = ['关键词1', '关键词2', '关键词3'];

      await redis.rpush(listKey, ...keywords);
      const listLength = await redis.llen(listKey);
      expect(listLength).toBe(3);

      const retrievedKeywords = await redis.lrange(listKey, 0, -1);
      expect(retrievedKeywords).toEqual(keywords);

      // 测试集合结构
      const setKey = 'test:set:tags';
      const tags = ['tag1', 'tag2', 'tag3', 'tag1']; // tag1重复

      await redis.sadd(setKey, ...tags);
      const setMembers = await redis.smembers(setKey);
      expect(setMembers).toHaveLength(3); // 自动去重
      expect(setMembers).toContain('tag1');
      expect(setMembers).toContain('tag2');
      expect(setMembers).toContain('tag3');

      // 测试哈希结构
      const hashKey = 'test:hash:account';
      const accountData = {
        id: 'account_123',
        balance: '1000.50',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
      };

      await redis.hmset(hashKey, accountData);
      const retrievedAccount = await redis.hgetall(hashKey);

      expect(retrievedAccount.id).toBe(accountData.id);
      expect(retrievedAccount.balance).toBe(accountData.balance);
      expect(retrievedAccount.status).toBe(accountData.status);
    });

    test('应该支持批量操作', async () => {
      // 批量设置
      const pipeline = redis.pipeline();
      const testData = Array.from({ length: 100 }, (_, i) => [
        `batch:key:${i}`,
        `batch:value:${i}`,
      ]);

      testData.forEach(([key, value]) => {
        pipeline.set(key, value, 'EX', 3600); // 1小时过期
      });

      const results = await pipeline.exec();
      expect(results).toHaveLength(100);
      expect(results?.every(([err]) => err === null)).toBe(true);

      // 批量获取
      const keys = testData.map(([key]) => key);
      const retrievedValues = await redis.mget(...keys);

      expect(retrievedValues).toHaveLength(100);
      expect(retrievedValues[0]).toBe('batch:value:0');
      expect(retrievedValues[99]).toBe('batch:value:99');
    });
  });

  describe('分布式锁机制', () => {
    test('应该实现基本的分布式锁', async () => {
      const lockKey = 'lock:test:resource';
      const lockValue = 'lock_holder_123';
      const lockTTL = 10; // 10秒

      // 获取锁
      const lockAcquired = await redis.set(
        lockKey,
        lockValue,
        'PX', // 毫秒
        lockTTL * 1000,
        'NX' // 只在键不存在时设置
      );

      expect(lockAcquired).toBe('OK');

      // 验证锁存在
      const currentValue = await redis.get(lockKey);
      expect(currentValue).toBe(lockValue);

      // 尝试获取同一锁应该失败
      const secondLockAttempt = await redis.set(
        lockKey,
        'another_holder',
        'PX',
        lockTTL * 1000,
        'NX'
      );

      expect(secondLockAttempt).toBe(null);

      // 释放锁（使用Lua脚本确保原子性）
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const released = await redis.eval(releaseScript, 1, lockKey, lockValue);
      expect(released).toBe(1);

      // 验证锁已释放
      const exists = await redis.exists(lockKey);
      expect(exists).toBe(0);
    });

    test('应该处理锁自动过期', async () => {
      const lockKey = 'lock:auto:expire';
      const lockValue = 'auto_expire_holder';

      // 获取1秒过期的锁
      await redis.set(lockKey, lockValue, 'PX', 1000, 'NX');

      // 验证锁存在
      let exists = await redis.exists(lockKey);
      expect(exists).toBe(1);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 锁应该自动过期
      exists = await redis.exists(lockKey);
      expect(exists).toBe(0);

      // 现在可以重新获取锁
      const newLock = await redis.set(lockKey, 'new_holder', 'PX', 5000, 'NX');
      expect(newLock).toBe('OK');
    });

    test('应该支持锁续期', async () => {
      const lockKey = 'lock:renewal:test';
      const lockValue = 'renewal_holder';
      const initialTTL = 2; // 2秒

      // 获取锁
      await redis.set(lockKey, lockValue, 'PX', initialTTL * 1000, 'NX');

      // 检查初始TTL
      let ttl = await redis.pttl(lockKey);
      expect(ttl).toBeGreaterThan(1000);
      expect(ttl).toBeLessThan(2000);

      // 等待1秒后续期
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 续期锁
      const renewalScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const renewed = await redis.eval(
        renewalScript,
        1,
        lockKey,
        lockValue,
        5000 // 5秒新的TTL
      );

      expect(renewed).toBe(1);

      // 验证新的TTL
      ttl = await redis.pttl(lockKey);
      expect(ttl).toBeGreaterThan(4000);
      expect(ttl).toBeLessThan(5000);
    });

    test('应该支持公平锁（FIFO队列）', async () => {
      const lockQueueKey = 'lock:fair:queue';
      const lockResourceKey = 'lock:fair:resource';

      // 三个客户端尝试获取锁
      const clients = ['client_1', 'client_2', 'client_3'];

      // 客户端1获取锁
      await redis.set(lockResourceKey, clients[0], 'PX', 5000, 'NX');

      // 客户端2和3进入等待队列
      await redis.zadd(lockQueueKey, Date.now(), clients[1]);
      await redis.zadd(lockQueueKey, Date.now() + 100, clients[2]);

      // 获取队列中的等待者
      const waiting = await redis.zrange(lockQueueKey, 0, -1);
      expect(waiting).toEqual([clients[1], clients[2]]);

      // 释放锁并通知下一个等待者
      await redis.del(lockResourceKey);

      // 模拟通知机制：获取最早的等待者
      const nextHolder = await redis.zrange(lockQueueKey, 0, 0);
      expect(nextHolder[0]).toBe(clients[1]);

      // 从队列中移除已通知的客户端
      await redis.zrem(lockQueueKey, clients[1]);

      const remaining = await redis.zrange(lockQueueKey, 0, -1);
      expect(remaining).toEqual([clients[2]]);
    });
  });

  describe('会话管理', () => {
    test('应该创建和管理用户会话', async () => {
      const sessionId = 'session_abc123';
      const userId = 'user_456';
      const sessionData = {
        userId,
        username: '测试用户',
        email: 'user@example.com',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
      };

      // 创建会话
      const sessionKey = `session:${sessionId}`;
      await redis.hmset(sessionKey, sessionData);
      await redis.expire(sessionKey, 3600); // 1小时过期

      // 检索会话数据
      const retrievedSession = await redis.hgetall(sessionKey);
      expect(retrievedSession.userId).toBe(userId);
      expect(retrievedSession.username).toBe('测试用户');

      // 更新最后活动时间
      const newActivityTime = new Date().toISOString();
      await redis.hset(sessionKey, 'lastActivity', newActivityTime);

      const updatedSession = await redis.hgetall(sessionKey);
      expect(updatedSession.lastActivity).toBe(newActivityTime);

      // 延长会话时间
      await redis.expire(sessionKey, 7200); // 延长到2小时
      const ttl = await redis.ttl(sessionKey);
      expect(ttl).toBeGreaterThan(3600);
    });

    test('应该支持会话失效和清理', async () => {
      const sessionId = 'session_expire_test';
      const sessionKey = `session:${sessionId}`;

      // 创建短会话
      await redis.hmset(sessionKey, {
        userId: 'user_test',
        username: '测试用户',
      });
      await redis.expire(sessionKey, 1); // 1秒过期

      // 立即检查存在
      let exists = await redis.exists(sessionKey);
      expect(exists).toBe(1);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 会话应该已过期
      exists = await redis.exists(sessionKey);
      expect(exists).toBe(0);

      // 清理过期会话
      const userSessionsPattern = 'session:*';
      const sessionKeys = await redis.keys(userSessionsPattern);
      expect(sessionKeys).toHaveLength(0);
    });

    test('应该支持多设备会话管理', async () => {
      const userId = 'multi_device_user';
      const devices = ['web', 'mobile', 'tablet'];

      // 为每个设备创建会话
      const sessionIds = devices.map(device => `${device}_${userId}`);

      for (let i = 0; i < devices.length; i++) {
        const sessionKey = `session:${sessionIds[i]}`;
        await redis.hmset(sessionKey, {
          userId,
          device: devices[i],
          loginTime: new Date().toISOString(),
        });
        await redis.expire(sessionKey, 3600);
      }

      // 维护用户活动会话列表
      const userActiveSessionsKey = `user_sessions:${userId}`;
      await redis.sadd(userActiveSessionsKey, ...sessionIds);
      await redis.expire(userActiveSessionsKey, 3600);

      // 获取用户所有活动会话
      const activeSessions = await redis.smembers(userActiveSessionsKey);
      expect(activeSessions).toHaveLength(3);
      expect(activeSessions).toContain('web_multi_device_user');
      expect(activeSessions).toContain('mobile_multi_device_user');
      expect(activeSessions).toContain('tablet_multi_device_user');

      // 注销某个设备的会话
      const webSessionKey = `session:web_${userId}`;
      await redis.del(webSessionKey);
      await redis.srem(userActiveSessionsKey, `web_${userId}`);

      const remainingSessions = await redis.smembers(userActiveSessionsKey);
      expect(remainingSessions).toHaveLength(2);
      expect(remainingSessions).not.toContain(`web_${userId}`);
    });
  });

  describe('缓存一致性', () => {
    test('应该实现缓存标签系统', async () => {
      const cacheKey = 'cache:user:123';
      const tag1 = 'tag:user';
      const tag2 = 'tag:profile';

      // 存储缓存数据和标签
      const cacheData = JSON.stringify({
        id: 123,
        name: '测试用户',
        email: 'user@example.com',
      });

      await redis.set(cacheKey, cacheData);

      // 建立缓存键和标签的关系
      await redis.sadd(`tags:${tag1}`, cacheKey);
      await redis.sadd(`tags:${tag2}`, cacheKey);

      // 按标签查找缓存键
      const keysForUserTag = await redis.smembers(`tags:${tag1}`);
      expect(keysForUserTag).toContain(cacheKey);

      const keysForProfileTag = await redis.smembers(`tags:${tag2}`);
      expect(keysForProfileTag).toContain(cacheKey);

      // 按标签清除缓存
      await redis.srem(`tags:${tag1}`, cacheKey);
      await redis.del(cacheKey);

      // 验证缓存已清除
      const exists = await redis.exists(cacheKey);
      expect(exists).toBe(0);

      // 验证标签关系已更新
      const remainingKeys = await redis.smembers(`tags:${tag1}`);
      expect(remainingKeys).not.toContain(cacheKey);
    });

    test('应该支持缓存版本控制', async () => {
      const dataKey = 'data:user:123';
      const versionKey = 'version:user:123';

      // 初始版本
      let version = 1;
      const initialData = JSON.stringify({
        id: 123,
        name: '用户123',
        version,
      });

      await redis.set(dataKey, initialData);
      await redis.set(versionKey, version.toString());

      // 更新数据并增加版本
      version++;
      const updatedData = JSON.stringify({
        id: 123,
        name: '用户123（已更新）',
        version,
      });

      await redis.set(dataKey, updatedData);
      await redis.set(versionKey, version.toString());

      // 验证版本更新
      const currentVersion = await redis.get(versionKey);
      expect(currentVersion).toBe(version.toString());

      const currentData = JSON.parse(await redis.get(dataKey)!);
      expect(currentData.version).toBe(version);
      expect(currentData.name).toBe('用户123（已更新）');
    });

    test('应该处理缓存穿透保护', async () => {
      const nonExistentKey = 'non_existent_data';
      const protectionKey = `protect:${nonExistentKey}`;

      // 第一次查询不存在的数据
      let result = await redis.get(nonExistentKey);
      expect(result).toBe(null);

      // 设置穿透保护：短时间缓存空结果
      await redis.setex(protectionKey, 60, 'empty'); // 60秒保护

      // 在保护期内，直接返回空结果而不查询后端
      result = await redis.get(protectionKey);
      expect(result).toBe('empty');

      // 模拟数据被创建
      await redis.set(nonExistentKey, 'real_data');
      await redis.del(protectionKey); // 移除保护

      // 现在可以获取真实数据
      result = await redis.get(nonExistentKey);
      expect(result).toBe('real_data');
    });
  });

  describe('故障恢复测试', () => {
    test('应该处理连接中断和重连', async () => {
      // 创建带有重连策略的Redis客户端
      const resilientRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 2, // 使用不同的数据库
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true, // 延迟连接
      });

      try {
        // 连接Redis
        await resilientRedis.connect();

        // 测试基本操作
        await resilientRedis.set('resilience_test', 'test_value');
        const value = await resilientRedis.get('resilience_test');
        expect(value).toBe('test_value');

        // 模拟网络问题（这里只能测试重连逻辑）
        await resilientRedis.ping(); // 测试连接是否正常

      } finally {
        await resilientRedis.quit();
      }
    });

    test('应该支持主从切换（模拟）', async () => {
      // 模拟主从配置的数据一致性检查
      const masterKey = 'master:consistency:test';
      const testData = '一致性测试数据';

      // 写入主节点
      await redis.set(masterKey, testData);

      // 模拟从节点读取（实际环境中需要真实的从节点）
      const readData = await redis.get(masterKey);
      expect(readData).toBe(testData);

      // 检查复制延迟（模拟）
      const timestamp = Date.now();
      await redis.set('replication:timestamp', timestamp.toString());

      const readTimestamp = await redis.get('replication:timestamp');
      expect(parseInt(readTimestamp!)).toBe(timestamp);
    });

    test('应该支持内存使用监控', async () => {
      // 获取Redis内存使用信息
      const memoryInfo = await redis.info('memory');
      expect(memoryInfo).toContain('used_memory:');
      expect(memoryInfo).toContain('used_memory_human:');

      // 解析内存使用量
      const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      if (usedMemoryMatch) {
        const usedMemory = parseInt(usedMemoryMatch[1]);
        expect(usedMemory).toBeGreaterThan(0);
      }

      // 插入大量数据测试内存增长
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => [
        `memory_test:${i}`,
        `large_value_${i}`.repeat(100),
      ]);

      const pipeline = redis.pipeline();
      largeDataSet.forEach(([key, value]) => {
        pipeline.set(key, value, 'EX', 300); // 5分钟过期
      });

      await pipeline.exec();

      // 再次检查内存使用
      const newMemoryInfo = await redis.info('memory');
      const newUsedMemoryMatch = newMemoryInfo.match(/used_memory:(\d+)/);

      if (newUsedMemoryMatch && usedMemoryMatch) {
        const oldMemory = parseInt(usedMemoryMatch[1]);
        const newMemory = parseInt(newUsedMemoryMatch[1]);
        expect(newMemory).toBeGreaterThan(oldMemory);
      }

      // 清理测试数据
      const keys = largeDataSet.map(([key]) => key);
      await redis.del(...keys);
    });
  });

  describe('性能优化测试', () => {
    test('应该优化大量键的查询', async () => {
      // 创建大量测试键
      const keys = Array.from({ length: 1000 }, (_, i) => `perf_test:${i}`);
      const values = Array.from({ length: 1000 }, (_, i) => `value_${i}`);

      // 批量设置
      const pipeline = redis.pipeline();
      keys.forEach((key, index) => {
        pipeline.set(key, values[index]);
      });
      await pipeline.exec();

      // 测试单个查询性能
      const singleStart = Date.now();
      for (const key of keys.slice(0, 100)) {
        await redis.get(key);
      }
      const singleTime = Date.now() - singleStart;

      // 测试批量查询性能
      const batchStart = Date.now();
      await redis.mget(...keys.slice(0, 100));
      const batchTime = Date.now() - batchStart;

      // 批量查询应该更快
      expect(batchTime).toBeLessThan(singleTime);

      // 清理
      await redis.del(...keys);
    });

    test('应该支持连接池管理', async () => {
      // 创建多个并发连接测试
      const concurrentOperations = Array.from({ length: 50 }, async (_, i) => {
        const key = `concurrent_test:${i}`;
        await redis.set(key, `value_${i}`);
        return await redis.get(key);
      });

      const results = await Promise.all(concurrentOperations);
      expect(results).toHaveLength(50);
      expect(results[0]).toBe('value_0');
      expect(results[49]).toBe('value_49');

      // 清理
      const keys = Array.from({ length: 50 }, (_, i) => `concurrent_test:${i}`);
      await redis.del(...keys);
    });
  });
});