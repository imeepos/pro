import { DataSource, DataSourceOptions } from 'typeorm';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { WeiboAccountEntity } from '../../src/weibo-account.entity.js';
import { WeiboSearchTaskEntity } from '../../src/weibo-search-task.entity.js';
import { UserEntity } from '../../src/user.entity.js';
import { WeiboAccountStatus, WeiboSearchTaskStatus } from '@pro/types';

/**
 * PostgreSQL实体集成测试
 * 测试微博账号和搜索任务的CRUD操作、约束验证和事务管理
 */
describe('PostgresEntitiesIntegrationTest', () => {
  let dataSource: DataSource;
  let userRepository: any;
  let weiboAccountRepository: any;
  let searchTaskRepository: any;

  // 测试数据库配置
  const testDbConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'test',
    password: process.env.POSTGRES_PASSWORD || 'test',
    database: process.env.POSTGRES_DB || 'test_pro_entities',
    entities: [UserEntity, WeiboAccountEntity, WeiboSearchTaskEntity],
    synchronize: true, // 测试环境自动同步表结构
    logging: false,
  };

  beforeAll(async () => {
    // 初始化数据源
    dataSource = new DataSource(testDbConfig);
    await dataSource.initialize();

    userRepository = dataSource.getRepository(UserEntity);
    weiboAccountRepository = dataSource.getRepository(WeiboAccountEntity);
    searchTaskRepository = dataSource.getRepository(WeiboSearchTaskEntity);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 清理测试数据
    await searchTaskRepository.delete({});
    await weiboAccountRepository.delete({});
    await userRepository.delete({});
  });

  afterEach(async () => {
    // 确保没有挂起的事务
    if (dataSource.isInitialized) {
      await dataSource.query('ROLLBACK');
    }
  });

  describe('微博账号实体CRUD操作', () => {
    test('应该创建微博账号并验证唯一约束', async () => {
      // 创建测试用户
      const user = await userRepository.save({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      });

      const accountData = {
        userId: user.id,
        weiboUid: '123456789',
        weiboNickname: '测试用户',
        weiboAvatar: 'https://example.com/avatar.jpg',
        cookies: JSON.stringify({ session: 'test-session' }),
        status: WeiboAccountStatus.ACTIVE,
      };

      // 创建第一个账号
      const account1 = await weiboAccountRepository.save(accountData);
      expect(account1.id).toBeDefined();
      expect(account1.weiboUid).toBe('123456789');
      expect(account1.status).toBe(WeiboAccountStatus.ACTIVE);

      // 验证唯一约束：同一用户不能重复绑定同一微博账号
      await expect(
        weiboAccountRepository.save(accountData)
      ).rejects.toThrow();
    });

    test('应该支持微博账号状态更新', async () => {
      const user = await userRepository.save({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      });

      const account = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: '987654321',
        cookies: JSON.stringify({ session: 'test' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      // 更新状态为禁用
      const updatedAccount = await weiboAccountRepository.save({
        ...account,
        status: WeiboAccountStatus.INACTIVE,
        lastCheckAt: new Date(),
      });

      expect(updatedAccount.status).toBe(WeiboAccountStatus.INACTIVE);
      expect(updatedAccount.lastCheckAt).toBeInstanceOf(Date);
    });

    test('应该验证微博账号关联的用户存在', async () => {
      const invalidAccount = {
        userId: 'non-existent-user-id',
        weiboUid: '111111111',
        cookies: JSON.stringify({ session: 'test' }),
      };

      await expect(
        weiboAccountRepository.save(invalidAccount)
      ).rejects.toThrow();
    });
  });

  describe('搜索任务实体状态管理', () => {
    test('应该创建搜索任务并验证计算属性', async () => {
      const taskData = {
        keyword: '测试关键词',
        startDate: new Date('2024-01-01'),
        crawlInterval: '1h',
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
      };

      const task = await searchTaskRepository.save(taskData);

      expect(task.needsInitialCrawl).toBe(true);
      expect(task.isHistoricalCrawlCompleted).toBe(false);
      expect(task.canRetry).toBe(true);
      expect(task.shouldPauseForNoData).toBe(false);
      expect(task.progressPercentage).toBe(0);
      expect(task.statusDescription).toBe('等待执行');
      expect(task.phaseDescription).toBe('等待首次抓取');
    });

    test('应该正确管理任务状态转换', async () => {
      const task = await searchTaskRepository.save({
        keyword: '状态测试',
        startDate: new Date('2024-01-01'),
        status: WeiboSearchTaskStatus.PENDING,
      });

      // 状态转换：PENDING -> RUNNING
      const runningTask = await searchTaskRepository.save({
        ...task,
        status: WeiboSearchTaskStatus.RUNNING,
        currentCrawlTime: new Date('2024-01-15'),
      });

      expect(runningTask.status).toBe(WeiboSearchTaskStatus.RUNNING);
      expect(runningTask.statusDescription).toBe('正在执行');
      expect(runningTask.phaseDescription).toBe('历史数据回溯中');

      // 状态转换：RUNNING -> PAUSED
      const pausedTask = await searchTaskRepository.save({
        ...runningTask,
        status: WeiboSearchTaskStatus.PAUSED,
      });

      expect(pausedTask.status).toBe(WeiboSearchTaskStatus.PAUSED);
      expect(pausedTask.statusDescription).toBe('已暂停');
    });

    test('应该正确计算任务进度', async () => {
      const task = await searchTaskRepository.save({
        keyword: '进度测试',
        startDate: new Date('2024-01-01'),
        progress: 25,
        totalSegments: 100,
      });

      expect(task.progressPercentage).toBe(25);

      // 测试进度上限
      const maxProgressTask = await searchTaskRepository.save({
        ...task,
        progress: 150,
      });

      expect(maxProgressTask.progressPercentage).toBe(100);
    });

    test('应该管理无数据检测机制', async () => {
      const task = await searchTaskRepository.save({
        keyword: '无数据测试',
        startDate: new Date('2024-01-01'),
        noDataCount: 3,
        noDataThreshold: 3,
      });

      expect(task.shouldPauseForNoData).toBe(true);

      // 重置计数器
      const resetTask = await searchTaskRepository.save({
        ...task,
        noDataCount: 0,
      });

      expect(resetTask.shouldPauseForNoData).toBe(false);
    });
  });

  describe('数据关联和约束验证', () => {
    test('应该建立微博账号与搜索任务的关联', async () => {
      // 创建用户和账号
      const user = await userRepository.save({
        email: 'association-test@example.com',
        password: 'hashedpassword',
        name: 'Association Test',
      });

      const account = await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: '555555555',
        cookies: JSON.stringify({ session: 'test' }),
        status: WeiboAccountStatus.ACTIVE,
      });

      // 创建指定账号的搜索任务
      const task = await searchTaskRepository.save({
        keyword: '关联测试',
        startDate: new Date('2024-01-01'),
        weiboAccountId: account.id,
        enableAccountRotation: false,
      });

      // 验证关联
      const taskWithAccount = await searchTaskRepository.findOne({
        where: { id: task.id },
        relations: ['weiboAccount'],
      });

      expect(taskWithAccount.weiboAccount.id).toBe(account.id);
      expect(taskWithAccount.enableAccountRotation).toBe(false);
    });

    test('应该验证外键约束', async () => {
      const invalidTask = {
        keyword: '无效外键测试',
        startDate: new Date('2024-01-01'),
        weiboAccountId: 99999, // 不存在的账号ID
      };

      await expect(
        searchTaskRepository.save(invalidTask)
      ).rejects.toThrow();
    });

    test('应该支持级联删除', async () => {
      const user = await userRepository.save({
        email: 'cascade-test@example.com',
        password: 'hashedpassword',
        name: 'Cascade Test',
      });

      await weiboAccountRepository.save({
        userId: user.id,
        weiboUid: '777777777',
        cookies: JSON.stringify({ session: 'test' }),
      });

      // 验证账号存在
      const accountsBefore = await weiboAccountRepository.find({
        where: { userId: user.id },
      });
      expect(accountsBefore).toHaveLength(1);

      // 删除用户，验证账号被级联删除
      await userRepository.delete({ id: user.id });

      const accountsAfter = await weiboAccountRepository.find({
        where: { userId: user.id },
      });
      expect(accountsAfter).toHaveLength(0);
    });
  });

  describe('事务回滚测试', () => {
    test('应该支持事务回滚', async () => {
      const user = await userRepository.save({
        email: 'transaction-test@example.com',
        password: 'hashedpassword',
        name: 'Transaction Test',
      });

      await dataSource.transaction(async (manager) => {
        // 创建账号
        const account = await manager.save(WeiboAccountEntity, {
          userId: user.id,
          weiboUid: '888888888',
          cookies: JSON.stringify({ session: 'test' }),
        });

        // 创建任务
        await manager.save(WeiboSearchTaskEntity, {
          keyword: '事务测试',
          startDate: new Date('2024-01-01'),
          weiboAccountId: account.id,
        });

        // 模拟错误，触发回滚
        throw new Error('模拟错误');
      });

      // 验证数据被回滚
      const accounts = await weiboAccountRepository.find({
        where: { userId: user.id },
      });
      const tasks = await searchTaskRepository.find({
        where: { keyword: '事务测试' },
      });

      expect(accounts).toHaveLength(0);
      expect(tasks).toHaveLength(0);
    });

    test('应该支持嵌套事务', async () => {
      const user = await userRepository.save({
        email: 'nested-transaction@example.com',
        password: 'hashedpassword',
        name: 'Nested Transaction',
      });

      await dataSource.transaction(async (manager) => {
        // 外层事务：创建账号
        const account = await manager.save(WeiboAccountEntity, {
          userId: user.id,
          weiboUid: '999999999',
          cookies: JSON.stringify({ session: 'test' }),
        });

        // 嵌套事务：创建任务
        await manager.transaction(async (nestedManager) => {
          await nestedManager.save(WeiboSearchTaskEntity, {
            keyword: '嵌套事务测试',
            startDate: new Date('2024-01-01'),
            weiboAccountId: account.id,
          });
        });
      });

      // 验证数据都成功创建
      const accounts = await weiboAccountRepository.find({
        where: { userId: user.id },
      });
      const tasks = await searchTaskRepository.find({
        where: { keyword: '嵌套事务测试' },
      });

      expect(accounts).toHaveLength(1);
      expect(tasks).toHaveLength(1);
    });
  });

  describe('数据库索引验证', () => {
    test('应该验证微博账号表索引', async () => {
      // 创建多个测试账号
      const user = await userRepository.save({
        email: 'index-test@example.com',
        password: 'hashedpassword',
        name: 'Index Test',
      });

      for (let i = 0; i < 10; i++) {
        await weiboAccountRepository.save({
          userId: user.id,
          weiboUid: `uid_${i}`,
          cookies: JSON.stringify({ session: `test_${i}` }),
          status: i % 2 === 0 ? WeiboAccountStatus.ACTIVE : WeiboAccountStatus.INACTIVE,
        });
      }

      // 测试状态索引查询
      const start = Date.now();
      const activeAccounts = await weiboAccountRepository.find({
        where: { status: WeiboAccountStatus.ACTIVE },
      });
      const queryTime = Date.now() - start;

      expect(activeAccounts).toHaveLength(5);
      expect(queryTime).toBeLessThan(100); // 索引应该使查询很快
    });

    test('应该验证搜索任务表复合索引', async () => {
      // 创建多个测试任务
      const now = new Date();
      for (let i = 0; i < 20; i++) {
        await searchTaskRepository.save({
          keyword: `关键词_${i}`,
          startDate: new Date('2024-01-01'),
          enabled: i % 3 !== 0,
          nextRunAt: new Date(now.getTime() + i * 60000), // 每个任务间隔1分钟
          status: WeiboSearchTaskStatus.PENDING,
        });
      }

      // 测试复合索引查询：enabled + nextRunAt
      const start = Date.now();
      const pendingTasks = await searchTaskRepository.find({
        where: {
          enabled: true,
          nextRunAt: { $lte: new Date(now.getTime() + 10 * 60000) },
        },
        order: { nextRunAt: 'ASC' },
      });
      const queryTime = Date.now() - start;

      expect(pendingTasks.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // 复合索引应该优化查询性能
    });
  });

  describe('边界条件和异常场景', () => {
    test('应该处理超长字符串', async () => {
      const user = await userRepository.save({
        email: 'boundary-test@example.com',
        password: 'hashedpassword',
        name: 'Boundary Test',
      });

      // 测试昵称长度边界
      const longNickname = 'a'.repeat(100); // 超过50字符限制
      await expect(
        weiboAccountRepository.save({
          userId: user.id,
          weiboUid: 'boundary_test',
          weiboNickname: longNickname,
          cookies: JSON.stringify({ session: 'test' }),
        })
      ).rejects.toThrow();
    });

    test('应该处理无效的枚举值', async () => {
      const user = await userRepository.save({
        email: 'enum-test@example.com',
        password: 'hashedpassword',
        name: 'Enum Test',
      });

      await expect(
        weiboAccountRepository.save({
          userId: user.id,
          weiboUid: 'enum_test',
          cookies: JSON.stringify({ session: 'test' }),
          status: 'INVALID_STATUS' as any,
        })
      ).rejects.toThrow();
    });

    test('应该处理并发创建冲突', async () => {
      const user = await userRepository.save({
        email: 'concurrent-test@example.com',
        password: 'hashedpassword',
        name: 'Concurrent Test',
      });

      const accountData = {
        userId: user.id,
        weiboUid: 'concurrent_uid',
        cookies: JSON.stringify({ session: 'test' }),
      };

      // 并发创建相同账号
      const promises = [
        weiboAccountRepository.save(accountData),
        weiboAccountRepository.save(accountData),
      ];

      await expect(Promise.all(promises)).rejects.toThrow();
    });
  });
});