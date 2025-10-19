/**
 * 搜索任务API集成测试艺术品
 *
 * 这个测试集验证微博搜索任务管理API的完整性和可靠性
 * 每个测试都是对任务调度系统精确性的深刻检验
 */

import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from '../factories/data.factory';

/**
 * 搜索任务API集成测试类
 * 继承自微博集成测试基类，专注于搜索任务相关的API测试
 */
class SearchTaskApiIntegrationTest extends WeiboIntegrationTestBase {
  private createdTaskIds: number[] = [];

  /**
   * 创建测试搜索任务
   */
  async createTestSearchTask(weiboAccountId?: number): Promise<number> {
    const taskData = TestDataFactory.searchTask.createTaskData();
    if (weiboAccountId) {
      taskData.weiboAccountId = weiboAccountId;
    }

    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          startDate
          status
          enabled
          createdAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      input: taskData,
    });

    const taskId = result.createWeiboSearchTask.id;
    this.createdTaskIds.push(taskId);

    return taskId;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    // 清理创建的测试任务
    for (const taskId of this.createdTaskIds) {
      try {
        const mutation = `
          mutation RemoveWeiboSearchTask($id: Int!) {
            removeWeiboSearchTask(id: $id)
          }
        `;

        await this.executeMutation(mutation, { id: taskId });
      } catch (error) {
        // 忽略清理时的错误
        console.warn(`清理任务 ${taskId} 失败:`, error);
      }
    }

    this.createdTaskIds = [];
  }
}

describe('搜索任务API集成测试', () => {
  let test: SearchTaskApiIntegrationTest;

  beforeAll(async () => {
    test = new SearchTaskApiIntegrationTest();
    await test.setupEnvironment();
    await test.createAndAuthenticateUser();
  });

  afterAll(async () => {
    await test.cleanupEnvironment();
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    await test.cleanupTestData();
  });

  describe('任务创建API', () => {
    it('应该能够创建搜索任务', async () => {
      const taskData = TestDataFactory.searchTask.createTaskData();

      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            startDate
            crawlInterval
            weiboAccountId
            enableAccountRotation
            noDataThreshold
            maxRetries
            enabled
            status
            createdAt
          }
        }
      `;

      const result = await test.executeMutation(mutation, {
        input: taskData,
      });

      test.expectGraphQLResponse(result, 'createWeiboSearchTask');
      expect(result.createWeiboSearchTask.id).toBeDefined();
      expect(result.createWeiboSearchTask.keyword).toBe(taskData.keyword);
      expect(result.createWeiboSearchTask.startDate).toBe(taskData.startDate);
      expect(result.createWeiboSearchTask.crawlInterval).toBe(taskData.crawlInterval);
      expect(result.createWeiboSearchTask.weiboAccountId).toBe(taskData.weiboAccountId);
      expect(result.createWeiboSearchTask.enabled).toBe(true);
      expect(result.createWeiboSearchTask.status).toBeDefined();
      test.expectValidDateString(result.createWeiboSearchTask.createdAt);
    });

    it('应该验证必填字段', async () => {
      const invalidTaskData = {
        // 缺少必填的 keyword
        startDate: '2023-01-01',
        crawlInterval: '1h',
        weiboAccountId: 1,
      };

      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
          createWeiboSearchTask(input: $input) {
            id
          }
        }
      `;

      await expect(test.executeMutation(mutation, {
        input: invalidTaskData,
      })).rejects.toThrow();
    });

    it('应该验证爬取间隔格式', async () => {
      const taskData = TestDataFactory.searchTask.createTaskData();
      taskData.crawlInterval = 'invalid-interval';

      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
          createWeiboSearchTask(input: $input) {
            id
          }
        }
      `;

      await expect(test.executeMutation(mutation, {
        input: taskData,
      })).rejects.toThrow();
    });

    it('应该验证日期格式', async () => {
      const taskData = TestDataFactory.searchTask.createTaskData();
      taskData.startDate = 'invalid-date';

      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
          createWeiboSearchTask(input: $input) {
            id
          }
        }
      `;

      await expect(test.executeMutation(mutation, {
        input: taskData,
      })).rejects.toThrow();
    });
  });

  describe('任务查询API', () => {
    beforeEach(async () => {
      // 创建一些测试任务
      await test.createTestSearchTask();
      await test.createTestSearchTask();
      await test.createTestSearchTask();
    });

    it('应该能够查询任务列表', async () => {
      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
                keyword
                status
                enabled
                createdAt
                updatedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `;

      const result = await test.executeQuery(query, {
        filter: { page: 1, limit: 10 }
      });

      test.expectGraphQLResponse(result, 'weiboSearchTasks');
      test.expectPaginatedResponse(result.weiboSearchTasks);

      expect(Array.isArray(result.weiboSearchTasks.edges)).toBe(true);
      expect(typeof result.weiboSearchTasks.totalCount).toBe('number');
      expect(result.weiboSearchTasks.totalCount).toBeGreaterThanOrEqual(3);
    });

    it('应该能够通过关键词过滤任务', async () => {
      const filter = TestDataFactory.searchTask.createQueryFilterData();

      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
                keyword
                status
                enabled
              }
            }
            totalCount
          }
        }
      `;

      const result = await test.executeQuery(query, {
        filter
      });

      test.expectGraphQLResponse(result, 'weiboSearchTasks');

      // 验证过滤结果
      const tasks = result.weiboSearchTasks.edges;
      if (filter.keyword) {
        tasks.forEach((edge: any) => {
          const node = edge.node;
          expect(node.keyword.toLowerCase()).toContain(filter.keyword.toLowerCase());
        });
      }
    });

    it('应该能够通过状态过滤任务', async () => {
      const filter = TestDataFactory.searchTask.createQueryFilterData();
      filter.keyword = undefined; // 清除关键词过滤

      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
                keyword
                status
                enabled
              }
            }
            totalCount
          }
        }
      `;

      const result = await test.executeQuery(query, {
        filter
      });

      test.expectGraphQLResponse(result, 'weiboSearchTasks');

      if (filter.status) {
        const tasks = result.weiboSearchTasks.edges;
        tasks.forEach((edge: any) => {
          const node = edge.node;
          expect(node.status).toBe(filter.status);
        });
      }
    });

    it('应该能够查询单个任务详情', async () => {
      const taskId = await test.createTestSearchTask();

      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            keyword
            startDate
            crawlInterval
            weiboAccountId
            enableAccountRotation
            noDataThreshold
            maxRetries
            status
            enabled
            createdAt
            updatedAt
          }
        }
      `;

      const result = await test.executeQuery(query, { id: taskId });

      test.expectGraphQLResponse(result, 'weiboSearchTask');
      expect(result.weiboSearchTask.id).toBe(taskId);
      expect(result.weiboSearchTask.keyword).toBeDefined();
      expect(result.weiboSearchTask.status).toBeDefined();
      expect(result.weiboSearchTask.enabled).toBeDefined();
    });

    it('查询不存在的任务应该返回错误', async () => {
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            keyword
          }
        }
      `;

      await expect(test.executeQuery(query, { id: 99999 }))
        .rejects.toThrow();
    });
  });

  describe('任务更新API', () => {
    it('应该能够更新任务', async () => {
      const taskId = await test.createTestSearchTask();
      const updateData = TestDataFactory.searchTask.createUpdateTaskData();

      const mutation = `
        mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
          updateWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
            crawlInterval
            enabled
            status
            updatedAt
          }
        }
      `;

      const result = await test.executeMutation(mutation, {
        id: taskId,
        input: updateData,
      });

      test.expectGraphQLResponse(result, 'updateWeiboSearchTask');
      expect(result.updateWeiboSearchTask.id).toBe(taskId);
      expect(result.updateWeiboSearchTask.keyword).toBe(updateData.keyword);
      expect(result.updateWeiboSearchTask.crawlInterval).toBe(updateData.crawlInterval);
      expect(result.updateWeiboSearchTask.enabled).toBe(updateData.enabled);
      test.expectValidDateString(result.updateWeiboSearchTask.updatedAt);
    });

    it('应该能够部分更新任务', async () => {
      const taskId = await test.createTestSearchTask();

      // 只更新关键词
      const partialUpdate = {
        keyword: 'updated-keyword'
      };

      const mutation = `
        mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
          updateWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
            crawlInterval
            enabled
          }
        }
      `;

      const result = await test.executeMutation(mutation, {
        id: taskId,
        input: partialUpdate,
      });

      test.expectGraphQLResponse(result, 'updateWeiboSearchTask');
      expect(result.updateWeiboSearchTask.id).toBe(taskId);
      expect(result.updateWeiboSearchTask.keyword).toBe(partialUpdate.keyword);
      // 其他字段应该保持不变
    });
  });

  describe('任务控制API', () => {
    it('应该能够暂停任务', async () => {
      const taskId = await test.createTestSearchTask();
      const pauseData = TestDataFactory.searchTask.createTaskOperationData();

      const mutation = `
        mutation PauseWeiboSearchTask($id: Int!, $input: PauseTaskDto) {
          pauseWeiboSearchTask(id: $id, input: $input) {
            id
            status
            enabled
            updatedAt
          }
        }
      `;

      const result = await test.executeMutation(mutation, {
        id: taskId,
        input: pauseData,
      });

      test.expectGraphQLResponse(result, 'pauseWeiboSearchTask');
      expect(result.pauseWeiboSearchTask.id).toBe(taskId);
      expect(result.pauseWeiboSearchTask.enabled).toBe(false);
      expect(['PAUSED', 'PENDING_PAUSE']).toContain(result.pauseWeiboSearchTask.status);
    });

    it('应该能够恢复任务', async () => {
      const taskId = await test.createTestSearchTask();

      // 先暂停任务
      const pauseMutation = `
        mutation PauseWeiboSearchTask($id: Int!) {
          pauseWeiboSearchTask(id: $id) {
            id
            status
            enabled
          }
        }
      `;
      await test.executeMutation(pauseMutation, { id: taskId });

      // 然后恢复任务
      const resumeData = TestDataFactory.searchTask.createTaskOperationData();

      const resumeMutation = `
        mutation ResumeWeiboSearchTask($id: Int!, $input: ResumeTaskDto) {
          resumeWeiboSearchTask(id: $id, input: $input) {
            id
            status
            enabled
            updatedAt
          }
        }
      `;

      const result = await test.executeMutation(resumeMutation, {
        id: taskId,
        input: resumeData,
      });

      test.expectGraphQLResponse(result, 'resumeWeiboSearchTask');
      expect(result.resumeWeiboSearchTask.id).toBe(taskId);
      expect(result.resumeWeiboSearchTask.enabled).toBe(true);
      expect(['PENDING', 'RUNNING']).toContain(result.resumeWeiboSearchTask.status);
    });

    it('应该能够立即运行任务', async () => {
      const taskId = await test.createTestSearchTask();
      const runNowData = TestDataFactory.searchTask.createTaskOperationData();

      const mutation = `
        mutation RunWeiboSearchTaskNow($id: Int!, $input: RunNowTaskDto) {
          runWeiboSearchTaskNow(id: $id, input: $input) {
            id
            status
            nextRunAt
            updatedAt
          }
        }
      `;

      const result = await test.executeMutation(mutation, {
        id: taskId,
        input: runNowData,
      });

      test.expectGraphQLResponse(result, 'runWeiboSearchTaskNow');
      expect(result.runWeiboSearchTaskNow.id).toBe(taskId);
      expect(['PENDING', 'RUNNING']).toContain(result.runWeiboSearchTaskNow.status);
      test.expectValidDateString(result.runWeiboSearchTaskNow.updatedAt);
    });

    it('应该能够暂停所有任务', async () => {
      // 创建多个任务
      await test.createTestSearchTask();
      await test.createTestSearchTask();
      await test.createTestSearchTask();

      const mutation = `
        mutation PauseAllWeiboSearchTasks {
          pauseAllWeiboSearchTasks
        }
      `;

      const result = await test.executeMutation(mutation);

      expect(typeof result.pauseAllWeiboSearchTasks).toBe('number');
      expect(result.pauseAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
    });

    it('应该能够恢复所有任务', async () => {
      // 创建多个任务
      await test.createTestSearchTask();
      await test.createTestSearchTask();

      const mutation = `
        mutation ResumeAllWeiboSearchTasks {
          resumeAllWeiboSearchTasks
        }
      `;

      const result = await test.executeMutation(mutation);

      expect(typeof result.resumeAllWeiboSearchTasks).toBe('number');
      expect(result.resumeAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('任务删除API', () => {
    it('应该能够删除任务', async () => {
      const taskId = await test.createTestSearchTask();

      const mutation = `
        mutation RemoveWeiboSearchTask($id: Int!) {
          removeWeiboSearchTask(id: $id)
        }
      `;

      const result = await test.executeMutation(mutation, { id: taskId });

      expect(result.removeWeiboSearchTask).toBe(true);

      // 验证任务已被删除
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
          }
        }
      `;

      await expect(test.executeQuery(query, { id: taskId }))
        .rejects.toThrow();
    });

    it('删除不存在的任务应该返回错误', async () => {
      const mutation = `
        mutation RemoveWeiboSearchTask($id: Int!) {
          removeWeiboSearchTask(id: $id)
        }
      `;

      await expect(test.executeMutation(mutation, { id: 99999 }))
        .rejects.toThrow();
    });
  });

  describe('任务统计API', () => {
    beforeEach(async () => {
      // 创建一些测试任务以获得有意义的统计数据
      await test.createTestSearchTask();
      await test.createTestSearchTask();
      await test.createTestSearchTask();
    });

    it('应该能够获取任务统计信息', async () => {
      const query = `
        query WeiboSearchTaskStats {
          weiboSearchTaskStats {
            total
            enabled
            running
            paused
            failed
            completed
          }
        }
      `;

      const result = await test.executeQuery(query);

      test.expectGraphQLResponse(result, 'weiboSearchTaskStats');
      expect(typeof result.weiboSearchTaskStats.total).toBe('number');
      expect(typeof result.weiboSearchTaskStats.enabled).toBe('number');
      expect(typeof result.weiboSearchTaskStats.running).toBe('number');
      expect(typeof result.weiboSearchTaskStats.paused).toBe('number');
      expect(typeof result.weiboSearchTaskStats.failed).toBe('number');
      expect(typeof result.weiboSearchTaskStats.completed).toBe('number');

      // 验证统计数据的逻辑一致性
      const stats = result.weiboSearchTaskStats;
      expect(stats.total).toBeGreaterThanOrEqual(stats.enabled);
      expect(stats.total).toBeGreaterThanOrEqual(stats.running + stats.paused + stats.failed + stats.completed);
      expect(stats.enabled).toBeGreaterThanOrEqual(stats.running);
      expect(stats.enabled).toBeGreaterThanOrEqual(stats.paused);
    });
  });

  describe('参数验证测试', () => {
    it('分页参数应该被正确验证', async () => {
      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
              }
            }
            totalCount
          }
        }
      `;

      // 测试负数页码
      await expect(test.executeQuery(query, {
        filter: { page: -1, limit: 10 }
      })).rejects.toThrow();

      // 测试过大的限制数量
      await expect(test.executeQuery(query, {
        filter: { page: 1, limit: 1000 }
      })).rejects.toThrow();
    });

    it('任务ID应该是正整数', async () => {
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
          }
        }
      `;

      // 测试负数ID
      await expect(test.executeQuery(query, { id: -1 }))
        .rejects.toThrow();

      // 测试零ID
      await expect(test.executeQuery(query, { id: 0 }))
        .rejects.toThrow();
    });

    it('排序参数应该被正确验证', async () => {
      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      // 测试无效的排序字段
      await expect(test.executeQuery(query, {
        filter: {
          page: 1,
          limit: 10,
          sortBy: 'invalidField',
          sortOrder: 'ASC'
        }
      })).rejects.toThrow();

      // 测试无效的排序方向
      await expect(test.executeQuery(query, {
        filter: {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'INVALID'
        }
      })).rejects.toThrow();
    });
  });

  describe('状态转换测试', () => {
    it('任务状态转换应该遵循业务规则', async () => {
      const taskId = await test.createTestSearchTask();

      // 获取初始状态
      const initialQuery = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            status
            enabled
          }
        }
      `;

      const initialResult = await test.executeQuery(initialQuery, { id: taskId });
      const initialStatus = initialResult.weiboSearchTask.status;

      // 暂停任务
      const pauseMutation = `
        mutation PauseWeiboSearchTask($id: Int!) {
          pauseWeiboSearchTask(id: $id) {
            id
            status
            enabled
          }
        }
      `;

      const pauseResult = await test.executeMutation(pauseMutation, { id: taskId });
      expect(pauseResult.pauseWeiboSearchTask.enabled).toBe(false);

      // 恢复任务
      const resumeMutation = `
        mutation ResumeWeiboSearchTask($id: Int!) {
          resumeWeiboSearchTask(id: $id) {
            id
            status
            enabled
          }
        }
      `;

      const resumeResult = await test.executeMutation(resumeMutation, { id: taskId });
      expect(resumeResult.resumeWeiboSearchTask.enabled).toBe(true);

      // 立即运行任务
      const runNowMutation = `
        mutation RunWeiboSearchTaskNow($id: Int!) {
          runWeiboSearchTaskNow(id: $id) {
            id
            status
            enabled
          }
        }
      `;

      const runNowResult = await test.executeMutation(runNowMutation, { id: taskId });
      expect(['PENDING', 'RUNNING']).toContain(runNowResult.runWeiboSearchTaskNow.status);
    });
  });

  describe('并发访问测试', () => {
    it('应该能够处理并发任务创建', async () => {
      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            status
          }
        }
      `;

      // 创建5个并发任务创建请求
      const concurrentRequests = Array.from({ length: 5 }, () => {
        const taskData = TestDataFactory.searchTask.createTaskData();
        return test.executeMutation(mutation, { input: taskData });
      });

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功
      results.forEach(result => {
        test.expectGraphQLResponse(result, 'createWeiboSearchTask');
        expect(result.createWeiboSearchTask.id).toBeDefined();
        expect(result.createWeiboSearchTask.keyword).toBeDefined();
        expect(result.createWeiboSearchTask.status).toBeDefined();
      });

      // 验证任务ID都是唯一的
      const taskIds = results.map(r => r.createWeiboSearchTask.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(taskIds.length);
    });

    it('应该能够处理并发任务控制操作', async () => {
      const taskIds = await Promise.all([
        test.createTestSearchTask(),
        test.createTestSearchTask(),
        test.createTestSearchTask(),
      ]);

      const pauseMutation = `
        mutation PauseWeiboSearchTask($id: Int!) {
          pauseWeiboSearchTask(id: $id) {
            id
            enabled
          }
        }
      `;

      // 创建并发暂停请求
      const concurrentRequests = taskIds.map(id =>
        test.executeMutation(pauseMutation, { id })
      );

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功
      results.forEach(result => {
        test.expectGraphQLResponse(result, 'pauseWeiboSearchTask');
        expect(result.pauseWeiboSearchTask.enabled).toBe(false);
      });
    });
  });

  describe('数据一致性测试', () => {
    it('任务统计应该与实际任务数量一致', async () => {
      // 创建一些任务
      await test.createTestSearchTask();
      await test.createTestSearchTask();

      // 获取统计信息
      const statsQuery = `
        query WeiboSearchTaskStats {
          weiboSearchTaskStats {
            total
            enabled
          }
        }
      `;

      const statsResult = await test.executeQuery(statsQuery);

      // 获取实际任务列表
      const listQuery = `
        query WeiboSearchTasks {
          weiboSearchTasks(filter: { page: 1, limit: 1000 }) {
            totalCount
          }
        }
      `;

      const listResult = await test.executeQuery(listQuery);

      expect(statsResult.weiboSearchTaskStats.total)
        .toBe(listResult.weiboSearchTasks.totalCount);
    });

    it('任务更新应该及时反映在查询结果中', async () => {
      const taskId = await test.createTestSearchTask();
      const updateData = {
        keyword: 'consistency-test-keyword'
      };

      // 更新任务
      const updateMutation = `
        mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
          updateWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
          }
        }
      `;

      await test.executeMutation(updateMutation, {
        id: taskId,
        input: updateData,
      });

      // 查询任务验证更新
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            keyword
          }
        }
      `;

      const result = await test.executeQuery(query, { id: taskId });

      expect(result.weiboSearchTask.keyword).toBe(updateData.keyword);
    });
  });
});