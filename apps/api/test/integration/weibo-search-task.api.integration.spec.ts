/**
 * 微博搜索任务管理API集成测试
 * 完美测试任务生命周期的每一个环节，验证任务的创建、执行、暂停、恢复和删除
 */

import { describe, it, expect } from '@jest/globals';
import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from './factories/data.factory';

describe('微博搜索任务管理API集成测试', () => {
  let testSuite: WeiboSearchTaskApiIntegrationTest;

  beforeAll(async () => {
    testSuite = new WeiboSearchTaskApiIntegrationTest();
    await testSuite.beforeAll();
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    await testSuite.beforeEach();
  });

  afterEach(async () => {
    await testSuite.afterEach();
  });

  describe('任务查询', () => {
    it('应该成功查询任务列表', async () => {
      await testSuite.testQueryTasksList();
    });

    it('应该支持关键词过滤查询', async () => {
      await testSuite.testQueryTasksWithKeywordFilter();
    });

    it('应该支持状态过滤查询', async () => {
      await testSuite.testQueryTasksWithStatusFilter();
    });

    it('应该支持分页查询', async () => {
      await testSuite.testQueryTasksWithPagination();
    });

    it('应该支持排序查询', async () => {
      await testSuite.testQueryTasksWithSorting();
    });

    it('应该查询单个任务详情', async () => {
      await testSuite.testQuerySingleTask();
    });
  });

  describe('任务创建', () => {
    it('应该成功创建搜索任务', async () => {
      await testSuite.testCreateSearchTask();
    });

    it('应该创建带地理位置的任务', async () => {
      await testSuite.testCreateSearchTaskWithLocation();
    });

    it('应该创建带自定义配置的任务', async () => {
      await testSuite.testCreateSearchTaskWithCustomConfig();
    });
  });

  describe('任务更新', () => {
    it('应该成功更新任务信息', async () => {
      await testSuite.testUpdateSearchTask();
    });

    it('应该更新任务状态', async () => {
      await testSuite.testUpdateTaskStatus();
    });

    it('应该重置任务计数器', async () => {
      await testSuite.testResetTaskCounters();
    });
  });

  describe('任务控制', () => {
    it('应该暂停任务', async () => {
      await testSuite.testPauseTask();
    });

    it('应该恢复任务', async () => {
      await testSuite.testResumeTask();
    });

    it('应该立即执行任务', async () => {
      await testSuite.testRunTaskNow();
    });

    it('应该批量暂停所有任务', async () => {
      await testSuite.testPauseAllTasks();
    });

    it('应该批量恢复所有任务', async () => {
      await testSuite.testResumeAllTasks();
    });
  });

  describe('任务统计', () => {
    it('应该获取任务统计信息', async () => {
      await testSuite.testGetTaskStats();
    });
  });

  describe('任务删除', () => {
    it('应该删除任务', async () => {
      await testSuite.testRemoveTask();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的任务ID', async () => {
      await testSuite.testHandleInvalidTaskId();
    });

    it('应该处理无效的任务数据', async () => {
      await testSuite.testHandleInvalidTaskData();
    });

    it('应该处理不存在的任务操作', async () => {
      await testSuite.testHandleNonexistentTaskOperation();
    });
  });
});

/**
 * 微博搜索任务管理API集成测试实现类
 */
class WeiboSearchTaskApiIntegrationTest extends WeiboIntegrationTestBase {
  private createdTaskId: number | null = null;

  /**
   * 测试查询任务列表
   */
  async testQueryTasksList(): Promise<void> {
    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              keyword
              startDate
              status
              enabled
              progress
              createdAt
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;

    const filterData = TestDataFactory.searchTask.createQueryFilterData();
    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');
    this.expectPaginatedResponse(result.weiboSearchTasks);

    // 验证任务数据结构
    if (result.weiboSearchTasks.edges.length > 0) {
      const task = result.weiboSearchTasks.edges[0].node;
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('keyword');
      expect(task).toHaveProperty('startDate');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('enabled');
      expect(task).toHaveProperty('progress');
      expect(typeof task.enabled).toBe('boolean');
      expect(typeof task.progress).toBe('number');
      this.expectValidDateString(task.startDate);
      this.expectValidDateString(task.createdAt);
      this.expectValidDateString(task.updatedAt);
    }
  }

  /**
   * 测试关键词过滤查询
   */
  async testQueryTasksWithKeywordFilter(): Promise<void> {
    // 先创建一个测试任务
    const taskData = TestDataFactory.searchTask.createTaskData();
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              keyword
            }
          }
          totalCount
        }
      }
    `;

    const filterData = TestDataFactory.searchTask.createQueryFilterData();
    filterData.keyword = createdTask.keyword;

    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');

    // 验证过滤结果
    if (result.weiboSearchTasks.edges.length > 0) {
      result.weiboSearchTasks.edges.forEach((edge: any) => {
        expect(edge.node.keyword).toContain(filterData.keyword);
      });
    }
  }

  /**
   * 测试状态过滤查询
   */
  async testQueryTasksWithStatusFilter(): Promise<void> {
    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              keyword
              status
            }
          }
          totalCount
        }
      }
    `;

    const filterData = TestDataFactory.searchTask.createQueryFilterData();
    filterData.status = 'PENDING';

    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');

    // 验证状态过滤
    if (result.weiboSearchTasks.edges.length > 0) {
      result.weiboSearchTasks.edges.forEach((edge: any) => {
        expect(edge.node.status).toBe(filterData.status);
      });
    }
  }

  /**
   * 测试分页查询
   */
  async testQueryTasksWithPagination(): Promise<void> {
    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              keyword
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;

    const paginationData = TestDataFactory.common.createPaginationData(1, 5);
    const filterData = {
      ...TestDataFactory.searchTask.createQueryFilterData(),
      ...paginationData,
    };

    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');
    this.expectPaginatedResponse(result.weiboSearchTasks);

    // 验证分页信息
    expect(result.weiboSearchTasks.totalCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.weiboSearchTasks.pageInfo.hasNextPage).toBe('boolean');
    expect(typeof result.weiboSearchTasks.pageInfo.hasPreviousPage).toBe('boolean');
  }

  /**
   * 测试排序查询
   */
  async testQueryTasksWithSorting(): Promise<void> {
    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              keyword
              createdAt
            }
          }
        }
      }
    `;

    const filterData = TestDataFactory.searchTask.createQueryFilterData();
    filterData.sortBy = 'createdAt';
    filterData.sortOrder = 'DESC';

    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');

    // 验证排序
    if (result.weiboSearchTasks.edges.length > 1) {
      for (let i = 0; i < result.weiboSearchTasks.edges.length - 1; i++) {
        const current = new Date(result.weiboSearchTasks.edges[i].node.createdAt);
        const next = new Date(result.weiboSearchTasks.edges[i + 1].node.createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }
  }

  /**
   * 测试查询单个任务详情
   */
  async testQuerySingleTask(): Promise<void> {
    // 创建测试任务
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const query = `
      query GetWeiboSearchTask($id: Int!) {
        weiboSearchTask(id: $id) {
          id
          keyword
          startDate
          crawlInterval
          status
          enabled
          progress
          noDataThreshold
          maxRetries
          longitude
          latitude
          locationAddress
          locationName
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.executeQuery(query, { id: createdTask.id });

    this.expectGraphQLResponse(result, 'weiboSearchTask');
    expect(result.weiboSearchTask.id).toBe(createdTask.id);
    expect(result.weiboSearchTask.keyword).toBe(createdTask.keyword);
    expect(result.weiboSearchTask).toHaveProperty('status');
    expect(result.weiboSearchTask).toHaveProperty('enabled');
    expect(result.weiboSearchTask).toHaveProperty('progress');
    expect(typeof result.weiboSearchTask.enabled).toBe('boolean');
    expect(typeof result.weiboSearchTask.progress).toBe('number');
    this.expectValidDateString(result.weiboSearchTask.startDate);
    this.expectValidDateString(result.weiboSearchTask.createdAt);
    this.expectValidDateString(result.weiboSearchTask.updatedAt);
  }

  /**
   * 测试创建搜索任务
   */
  async testCreateSearchTask(): Promise<void> {
    const taskData = TestDataFactory.searchTask.createTaskData();

    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          startDate
          crawlInterval
          status
          enabled
          createdAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      input: taskData,
    });

    this.expectGraphQLResponse(result, 'createWeiboSearchTask');
    expect(result.createWeiboSearchTask.keyword).toBe(taskData.keyword);
    expect(result.createWeiboSearchTask.startDate).toBe(taskData.startDate);
    expect(result.createWeiboSearchTask.crawlInterval).toBe(taskData.crawlInterval);
    expect(result.createWeiboSearchTask).toHaveProperty('status');
    expect(result.createWeiboSearchTask).toHaveProperty('enabled');
    expect(result.createWeiboSearchTask.enabled).toBe(true); // 默认启用
    this.expectValidDateString(result.createWeiboSearchTask.createdAt);

    this.createdTaskId = result.createWeiboSearchTask.id;
  }

  /**
   * 测试创建带地理位置的任务
   */
  async testCreateSearchTaskWithLocation(): Promise<void> {
    const taskData = TestDataFactory.searchTask.createTaskData();
    taskData.locationAddress = '北京市朝阳区';
    taskData.locationName = '北京';
    taskData.longitude = 116.4074;
    taskData.latitude = 39.9042;

    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          longitude
          latitude
          locationAddress
          locationName
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      input: taskData,
    });

    this.expectGraphQLResponse(result, 'createWeiboSearchTask');
    expect(result.createWeiboSearchTask.longitude).toBe(taskData.longitude);
    expect(result.createWeiboSearchTask.latitude).toBe(taskData.latitude);
    expect(result.createWeiboSearchTask.locationAddress).toBe(taskData.locationAddress);
    expect(result.createWeiboSearchTask.locationName).toBe(taskData.locationName);
  }

  /**
   * 测试创建带自定义配置的任务
   */
  async testCreateSearchTaskWithCustomConfig(): Promise<void> {
    const taskData = TestDataFactory.searchTask.createTaskData();
    taskData.crawlInterval = '2h';
    taskData.enableAccountRotation = true;
    taskData.noDataThreshold = 5;
    taskData.maxRetries = 3;

    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          crawlInterval
          enableAccountRotation
          noDataThreshold
          maxRetries
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      input: taskData,
    });

    this.expectGraphQLResponse(result, 'createWeiboSearchTask');
    expect(result.createWeiboSearchTask.crawlInterval).toBe(taskData.crawlInterval);
    expect(result.createWeiboSearchTask.enableAccountRotation).toBe(taskData.enableAccountRotation);
    expect(result.createWeiboSearchTask.noDataThreshold).toBe(taskData.noDataThreshold);
    expect(result.createWeiboSearchTask.maxRetries).toBe(taskData.maxRetries);
  }

  /**
   * 测试更新任务信息
   */
  async testUpdateSearchTask(): Promise<void> {
    // 先创建任务
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const updateData = TestDataFactory.searchTask.createUpdateTaskData();

    const mutation = `
      mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
        updateWeiboSearchTask(id: $id, input: $input) {
          id
          keyword
          crawlInterval
          enabled
          updatedAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: updateData,
    });

    this.expectGraphQLResponse(result, 'updateWeiboSearchTask');
    expect(result.updateWeiboSearchTask.id).toBe(createdTask.id);
    expect(result.updateWeiboSearchTask.keyword).toBe(updateData.keyword);
    expect(result.updateWeiboSearchTask.crawlInterval).toBe(updateData.crawlInterval);
    expect(result.updateWeiboSearchTask.enabled).toBe(updateData.enabled);
    this.expectValidDateString(result.updateWeiboSearchTask.updatedAt);
  }

  /**
   * 测试更新任务状态
   */
  async testUpdateTaskStatus(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const updateData = {
      status: 'PAUSED',
      enabled: false,
    };

    const mutation = `
      mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
        updateWeiboSearchTask(id: $id, input: $input) {
          id
          status
          enabled
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: updateData,
    });

    this.expectGraphQLResponse(result, 'updateWeiboSearchTask');
    expect(result.updateWeiboSearchTask.status).toBe(updateData.status);
    expect(result.updateWeiboSearchTask.enabled).toBe(updateData.enabled);
  }

  /**
   * 测试重置任务计数器
   */
  async testResetTaskCounters(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const updateData = {
      resetRetryCount: true,
      resetNoDataCount: true,
    };

    const mutation = `
      mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskDto!) {
        updateWeiboSearchTask(id: $id, input: $input) {
          id
          progress
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: updateData,
    });

    this.expectGraphQLResponse(result, 'updateWeiboSearchTask');
    expect(typeof result.updateWeiboSearchTask.progress).toBe('number');
  }

  /**
   * 测试暂停任务
   */
  async testPauseTask(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const pauseData = TestDataFactory.searchTask.createTaskOperationData();

    const mutation = `
      mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput) {
        pauseWeiboSearchTask(id: $id, input: $input) {
          id
          status
          enabled
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: pauseData,
    });

    this.expectGraphQLResponse(result, 'pauseWeiboSearchTask');
    expect(result.pauseWeiboSearchTask.id).toBe(createdTask.id);
    expect(result.pauseWeiboSearchTask.status).toBe('PAUSED');
    expect(result.pauseWeiboSearchTask.enabled).toBe(false);
  }

  /**
   * 测试恢复任务
   */
  async testResumeTask(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    // 先暂停任务
    await this.testPauseTask();

    const resumeData = TestDataFactory.searchTask.createTaskOperationData();

    const mutation = `
      mutation ResumeWeiboSearchTask($id: Int!, $input: ResumeWeiboTaskInput) {
        resumeWeiboSearchTask(id: $id, input: $input) {
          id
          status
          enabled
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: resumeData,
    });

    this.expectGraphQLResponse(result, 'resumeWeiboSearchTask');
    expect(result.resumeWeiboSearchTask.id).toBe(createdTask.id);
    expect(result.resumeWeiboSearchTask.enabled).toBe(true);
  }

  /**
   * 测试立即执行任务
   */
  async testRunTaskNow(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    this.createdTaskId = createdTask.id;

    const runData = TestDataFactory.searchTask.createTaskOperationData();

    const mutation = `
      mutation RunWeiboSearchTaskNow($id: Int!, $input: RunWeiboTaskNowInput) {
        runWeiboSearchTaskNow(id: $id, input: $input) {
          id
          status
          nextRunAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      id: createdTask.id,
      input: runData,
    });

    this.expectGraphQLResponse(result, 'runWeiboSearchTaskNow');
    expect(result.runWeiboSearchTaskNow.id).toBe(createdTask.id);
    expect(result.runWeiboSearchTaskNow.status).toBe('RUNNING');
    expect(result.runWeiboSearchTaskNow).toHaveProperty('nextRunAt');
  }

  /**
   * 测试批量暂停所有任务
   */
  async testPauseAllTasks(): Promise<void> {
    const mutation = `
      mutation PauseAllWeiboSearchTasks {
        pauseAllWeiboSearchTasks
      }
    `;

    const result = await this.executeMutation(mutation);

    this.expectGraphQLResponse(result, 'pauseAllWeiboSearchTasks');
    expect(typeof result.pauseAllWeiboSearchTasks).toBe('number');
    expect(result.pauseAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
  }

  /**
   * 测试批量恢复所有任务
   */
  async testResumeAllTasks(): Promise<void> {
    const mutation = `
      mutation ResumeAllWeiboSearchTasks {
        resumeAllWeiboSearchTasks
      }
    `;

    const result = await this.executeMutation(mutation);

    this.expectGraphQLResponse(result, 'resumeAllWeiboSearchTasks');
    expect(typeof result.resumeAllWeiboSearchTasks).toBe('number');
    expect(result.resumeAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
  }

  /**
   * 测试获取任务统计信息
   */
  async testGetTaskStats(): Promise<void> {
    const query = `
      query GetWeiboSearchTaskStats {
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

    const result = await this.executeQuery(query);

    this.expectGraphQLResponse(result, 'weiboSearchTaskStats');
    expect(typeof result.weiboSearchTaskStats.total).toBe('number');
    expect(typeof result.weiboSearchTaskStats.enabled).toBe('number');
    expect(typeof result.weiboSearchTaskStats.running).toBe('number');
    expect(typeof result.weiboSearchTaskStats.paused).toBe('number');
    expect(typeof result.weiboSearchTaskStats.failed).toBe('number');
    expect(typeof result.weiboSearchTaskStats.completed).toBe('number');

    // 验证统计数据的合理性
    expect(result.weiboSearchTaskStats.total).toBeGreaterThanOrEqual(0);
    expect(result.weiboSearchTaskStats.enabled).toBeGreaterThanOrEqual(0);
    expect(result.weiboSearchTaskStats.running).toBeGreaterThanOrEqual(0);
    expect(result.weiboSearchTaskStats.paused).toBeGreaterThanOrEqual(0);
    expect(result.weiboSearchTaskStats.failed).toBeGreaterThanOrEqual(0);
    expect(result.weiboSearchTaskStats.completed).toBeGreaterThanOrEqual(0);

    // 验证总数等于各状态数量之和
    const sumOfStates = result.weiboSearchTaskStats.running +
      result.weiboSearchTaskStats.paused +
      result.weiboSearchTaskStats.failed +
      result.weiboSearchTaskStats.completed;
    expect(result.weiboSearchTaskStats.total).toBeGreaterThanOrEqual(sumOfStates);
  }

  /**
   * 测试删除任务
   */
  async testRemoveTask(): Promise<void> {
    const createdTask = await this.createTestSearchTask();
    const taskId = createdTask.id;

    const mutation = `
      mutation RemoveWeiboSearchTask($id: Int!) {
        removeWeiboSearchTask(id: $id)
      }
    `;

    const result = await this.executeMutation(mutation, { id: taskId });

    this.expectGraphQLResponse(result, 'removeWeiboSearchTask');
    expect(typeof result.removeWeiboSearchTask).toBe('boolean');
    expect(result.removeWeiboSearchTask).toBe(true);

    // 验证任务已被删除
    const query = `
      query GetWeiboSearchTask($id: Int!) {
        weiboSearchTask(id: $id) {
          id
        }
      }
    `;

    try {
      await this.executeQuery(query, { id: taskId });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }

  /**
   * 测试处理无效的任务ID
   */
  async testHandleInvalidTaskId(): Promise<void> {
    const query = `
      query GetWeiboSearchTask($id: Int!) {
        weiboSearchTask(id: $id) {
          id
          keyword
        }
      }
    `;

    const invalidTaskId = -1;

    try {
      await this.executeQuery(query, { id: invalidTaskId });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }

  /**
   * 测试处理无效的任务数据
   */
  async testHandleInvalidTaskData(): Promise<void> {
    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
        }
      }
    `;

    const invalidData = {
      keyword: '', // 空关键词应该无效
      startDate: 'invalid-date', // 无效日期格式
      crawlInterval: 'invalid-interval', // 无效间隔格式
    };

    try {
      await this.executeMutation(mutation, { input: invalidData });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }

  /**
   * 测试处理不存在的任务操作
   */
  async testHandleNonexistentTaskOperation(): Promise<void> {
    const mutation = `
      mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput) {
        pauseWeiboSearchTask(id: $id, input: $input) {
          id
          status
        }
      }
    `;

    const nonexistentTaskId = 999999;
    const pauseData = TestDataFactory.searchTask.createTaskOperationData();

    try {
      await this.executeMutation(mutation, {
        id: nonexistentTaskId,
        input: pauseData,
      });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }
}