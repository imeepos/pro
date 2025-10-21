/**
 * 微博搜索任务管理 API 集成测试（精简版）
 * 覆盖基于精简实体的核心能力：查询、过滤、创建、更新、调度控制与统计
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { WeiboSearchTaskDataFactory } from './factories/data.factory';

describe('微博搜索任务 API', () => {
  let suite: MinimalWeiboSearchTaskApiTest;

  beforeAll(async () => {
    suite = new MinimalWeiboSearchTaskApiTest();
    await suite.beforeAll();
  });

  afterAll(async () => {
    await suite.afterAll();
  });

  beforeEach(async () => {
    await suite.beforeEach();
  });

  afterEach(async () => {
    await suite.afterEach();
  });

  describe('列表查询', () => {
    it('应该返回任务列表', async () => {
      await suite.testQueryTasksList();
    });

    it('应该支持关键词过滤', async () => {
      await suite.testQueryTasksWithKeywordFilter();
    });

    it('应该支持启用状态过滤', async () => {
      await suite.testQueryTasksWithEnabledFilter();
    });

    it('应该支持分页与排序', async () => {
      await suite.testQueryTasksWithPaginationAndSorting();
    });
  });

  describe('详情与写操作', () => {
    it('应该返回任务详情', async () => {
      await suite.testQuerySingleTask();
    });

    it('应该创建任务', async () => {
      await suite.testCreateTask();
    });

    it('应该更新任务', async () => {
      await suite.testUpdateTask();
    });

    it('应该暂停与恢复任务', async () => {
      await suite.testPauseAndResumeTask();
    });

    it('应该立即执行任务', async () => {
      await suite.testRunTaskNow();
    });

    it('应该删除任务', async () => {
      await suite.testRemoveTask();
    });
  });

  describe('统计', () => {
    it('应该返回任务统计数据', async () => {
      await suite.testTaskStats();
    });
  });
});

class MinimalWeiboSearchTaskApiTest extends WeiboIntegrationTestBase {
  private createdTaskId: number | null = null;

  async testQueryTasksList(): Promise<void> {
    await this.ensureBaselineTask();

    const query = `
      query GetTasks {
        weiboSearchTasks {
          edges {
            node {
              id
              keyword
              enabled
              crawlInterval
            }
          }
          totalCount
        }
      }
    `;

    const result = await this.executeQuery(query, {});
    this.expectGraphQLResponse(result, 'weiboSearchTasks');

    expect(Array.isArray(result.weiboSearchTasks.edges)).toBe(true);
    expect(typeof result.weiboSearchTasks.totalCount).toBe('number');
  }

  async testQueryTasksWithKeywordFilter(): Promise<void> {
    const created = await this.createTestTask();

    const query = `
      query GetTasks($filter: WeiboSearchTaskFilterInput) {
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

    const result = await this.executeQuery(query, {
      filter: { keyword: created.keyword },
    });

    this.expectGraphQLResponse(result, 'weiboSearchTasks');
    expect(result.weiboSearchTasks.edges.length).toBeGreaterThan(0);
    result.weiboSearchTasks.edges.forEach((edge: any) => {
      expect(edge.node.keyword).toContain(created.keyword);
    });
  }

  async testQueryTasksWithEnabledFilter(): Promise<void> {
    const query = `
      query GetTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              enabled
            }
          }
          totalCount
        }
      }
    `;

    const result = await this.executeQuery(query, { filter: { enabled: true } });
    this.expectGraphQLResponse(result, 'weiboSearchTasks');
    result.weiboSearchTasks.edges.forEach((edge: any) => {
      expect(edge.node.enabled).toBe(true);
    });
  }

  async testQueryTasksWithPaginationAndSorting(): Promise<void> {
    const query = `
      query GetTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          edges {
            node {
              id
              createdAt
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

    const filter = {
      page: 1,
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    const result = await this.executeQuery(query, { filter });
    this.expectGraphQLResponse(result, 'weiboSearchTasks');

    expect(typeof result.weiboSearchTasks.totalCount).toBe('number');
    expect(typeof result.weiboSearchTasks.pageInfo.hasNextPage).toBe('boolean');

    const edges = result.weiboSearchTasks.edges;
    for (let i = 0; i < edges.length - 1; i++) {
      const current = new Date(edges[i].node.createdAt).getTime();
      const next = new Date(edges[i + 1].node.createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  }

  async testQuerySingleTask(): Promise<void> {
    const created = await this.createTestTask();

    const query = `
      query GetTask($id: Int!) {
        weiboSearchTask(id: $id) {
          id
          keyword
          enabled
          crawlInterval
          startDate
          latestCrawlTime
          nextRunAt
        }
      }
    `;

    const result = await this.executeQuery(query, { id: created.id });
    this.expectGraphQLResponse(result, 'weiboSearchTask');

    expect(result.weiboSearchTask.id).toBe(created.id);
    expect(result.weiboSearchTask.keyword).toBe(created.keyword);
  }

  async testCreateTask(): Promise<void> {
    const mutation = `
      mutation CreateTask($input: CreateWeiboSearchTaskInput!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          crawlInterval
          enabled
          startDate
        }
      }
    `;

    const input = WeiboSearchTaskDataFactory.createTaskData();
    const result = await this.executeMutation(mutation, { input });

    this.expectGraphQLResponse(result, 'createWeiboSearchTask');
    expect(result.createWeiboSearchTask.keyword).toBe(input.keyword);
    expect(result.createWeiboSearchTask.enabled).toBe(true);
  }

  async testUpdateTask(): Promise<void> {
    const created = await this.createTestTask();

    const mutation = `
      mutation UpdateTask($id: Int!, $input: UpdateWeiboSearchTaskInput!) {
        updateWeiboSearchTask(id: $id, input: $input) {
          id
          keyword
          crawlInterval
          enabled
        }
      }
    `;

    const input = {
      keyword: `${created.keyword}_updated`,
      crawlInterval: '2h',
      enabled: false,
    };

    const result = await this.executeMutation(mutation, { id: created.id, input });
    this.expectGraphQLResponse(result, 'updateWeiboSearchTask');

    expect(result.updateWeiboSearchTask.keyword).toBe(input.keyword);
    expect(result.updateWeiboSearchTask.crawlInterval).toBe(input.crawlInterval);
    expect(result.updateWeiboSearchTask.enabled).toBe(false);
  }

  async testPauseAndResumeTask(): Promise<void> {
    const created = await this.createTestTask();

    const pauseMutation = `
      mutation PauseTask($id: Int!) {
        pauseWeiboSearchTask(id: $id) {
          id
          enabled
        }
      }
    `;

    const pauseResult = await this.executeMutation(pauseMutation, { id: created.id });
    this.expectGraphQLResponse(pauseResult, 'pauseWeiboSearchTask');
    expect(pauseResult.pauseWeiboSearchTask.enabled).toBe(false);

    const resumeMutation = `
      mutation ResumeTask($id: Int!) {
        resumeWeiboSearchTask(id: $id) {
          id
          enabled
        }
      }
    `;

    const resumeResult = await this.executeMutation(resumeMutation, { id: created.id });
    this.expectGraphQLResponse(resumeResult, 'resumeWeiboSearchTask');
    expect(resumeResult.resumeWeiboSearchTask.enabled).toBe(true);
  }

  async testRunTaskNow(): Promise<void> {
    const created = await this.createTestTask();

    const mutation = `
      mutation RunNow($id: Int!) {
        runWeiboSearchTaskNow(id: $id) {
          id
          nextRunAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, { id: created.id });
    this.expectGraphQLResponse(result, 'runWeiboSearchTaskNow');

    expect(result.runWeiboSearchTaskNow.nextRunAt).toBeTruthy();
  }

  async testRemoveTask(): Promise<void> {
    const created = await this.createTestTask();

    const mutation = `
      mutation RemoveTask($id: Int!) {
        removeWeiboSearchTask(id: $id)
      }
    `;

    const result = await this.executeMutation(mutation, { id: created.id });
    this.expectGraphQLResponse(result, 'removeWeiboSearchTask');

    expect(result.removeWeiboSearchTask).toBe(true);
  }

  async testTaskStats(): Promise<void> {
    const query = `
      query TaskStats {
        weiboSearchTaskStats {
          total
          enabled
          disabled
        }
      }
    `;

    const result = await this.executeQuery(query, {});
    this.expectGraphQLResponse(result, 'weiboSearchTaskStats');

    expect(typeof result.weiboSearchTaskStats.total).toBe('number');
    expect(typeof result.weiboSearchTaskStats.enabled).toBe('number');
    expect(typeof result.weiboSearchTaskStats.disabled).toBe('number');
  }

  private async ensureBaselineTask(): Promise<void> {
    if (this.createdTaskId !== null) return;
    const created = await this.createTestTask();
    this.createdTaskId = created.id;
  }

  private async createTestTask(overrides: Partial<ReturnType<typeof WeiboSearchTaskDataFactory.createTaskData>> = {}) {
    const mutation = `
      mutation CreateTask($input: CreateWeiboSearchTaskInput!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          enabled
          crawlInterval
          startDate
          latestCrawlTime
          nextRunAt
          createdAt
          updatedAt
        }
      }
    `;

    const input = {
      ...WeiboSearchTaskDataFactory.createTaskData(),
      ...overrides,
    };

    const result = await this.executeMutation(mutation, { input });
    this.expectGraphQLResponse(result, 'createWeiboSearchTask');

    return result.createWeiboSearchTask;
  }
}

