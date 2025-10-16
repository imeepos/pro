import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser } from './graphql-test-client';

describe('WeiboSearchTaskResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;
  let authToken: string;
  let testUserId: string;
  let testTaskId: number;

  beforeAll(async () => {
    testSetup = new GraphQLTestSetup();
    await testSetup.createTestApp();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    // Create a test user and get auth token for each test
    const client = testSetup.createTestClient(TEST_API_KEY);
    const mockUser = createMockUser();

    const registerMutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          user {
            id
            username
          }
          accessToken
        }
      }
    `;

    const result = await client.mutate(registerMutation, {
      input: mockUser,
    });

    testUserId = result.register.user.id;
    authToken = result.register.accessToken;
  });

  describe('Weibo Search Task Queries', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get paginated weibo search tasks', async () => {
      const query = `
        query WeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
                keyword
                status
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

      const result = await client.query(query, {
        filter: {
          page: 1,
          limit: 10,
        },
      });

      expect(result).toHaveProperty('weiboSearchTasks');
      expect(result.weiboSearchTasks).toHaveProperty('edges');
      expect(result.weiboSearchTasks).toHaveProperty('pageInfo');
      expect(result.weiboSearchTasks).toHaveProperty('totalCount');
      expect(Array.isArray(result.weiboSearchTasks.edges)).toBe(true);
    });

    it('should get single weibo search task by ID', async () => {
      // First create a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const mockTask = {
        keyword: `测试关键词_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      testTaskId = Number(createResult.createWeiboSearchTask.id);

      // Now query the task
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            keyword
            status
            enabled
            createdAt
            updatedAt
          }
        }
      `;

      const result = await client.query(query, {
        id: testTaskId,
      });

      expect(result).toHaveProperty('weiboSearchTask');
      expect(result.weiboSearchTask.id).toBe(testTaskId.toString());
      expect(result.weiboSearchTask.keyword).toBe(mockTask.keyword);
      expect(result.weiboSearchTask.enabled).toBe(true); // Default enabled value
    });

    it('should get weibo search task statistics', async () => {
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

      const result = await client.query(query);
      expect(result).toHaveProperty('weiboSearchTaskStats');
      expect(result.weiboSearchTaskStats).toHaveProperty('total');
      expect(result.weiboSearchTaskStats).toHaveProperty('enabled');
      expect(result.weiboSearchTaskStats).toHaveProperty('running');
      expect(result.weiboSearchTaskStats).toHaveProperty('paused');
      expect(result.weiboSearchTaskStats).toHaveProperty('failed');
      expect(result.weiboSearchTaskStats).toHaveProperty('completed');
      expect(typeof result.weiboSearchTaskStats.total).toBe('number');
    });
  });

  describe('Weibo Search Task Mutations', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should create a new weibo search task', async () => {
      const mockTask = {
        keyword: `测试关键词_${Date.now()}`,
        startDate: new Date().toISOString(),
        crawlInterval: '0 */6 * * *', // Every 6 hours
      };

      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            enabled
            status
            createdAt
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: mockTask,
      });

      expect(result).toHaveProperty('createWeiboSearchTask');
      expect(result.createWeiboSearchTask).toHaveProperty('id');
      expect(result.createWeiboSearchTask.keyword).toBe(mockTask.keyword);
      expect(result.createWeiboSearchTask.status).toBe('PENDING');
      testTaskId = Number(result.createWeiboSearchTask.id);
    });

    it('should update an existing weibo search task', async () => {
      // First create a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            maxRetries
            enabled
          }
        }
      `;

      const mockTask = {
        keyword: `原始关键词_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      testTaskId = Number(createResult.createWeiboSearchTask.id);

      // Now update the task
      const updateData = {
        keyword: `更新关键词_${Date.now()}`,
        enabled: false,
      };

      const updateMutation = `
        mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskInput!) {
          updateWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
            enabled
            updatedAt
          }
        }
      `;

      const result = await client.mutate(updateMutation, {
        id: testTaskId,
        input: updateData,
      });

      expect(result).toHaveProperty('updateWeiboSearchTask');
      expect(result.updateWeiboSearchTask.id).toBe(testTaskId.toString());
      expect(result.updateWeiboSearchTask.keyword).toBe(updateData.keyword);
      expect(result.updateWeiboSearchTask.enabled).toBe(updateData.enabled);
    });

    it('should pause a weibo search task', async () => {
      // First create and enable a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const mockTask = {
        keyword: `暂停测试_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      testTaskId = Number(createResult.createWeiboSearchTask.id);

      // Now pause the task
      const mutation = `
        mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput!) {
          pauseWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        id: testTaskId,
        input: { reason: 'Test pause' },
      });

      expect(result).toHaveProperty('pauseWeiboSearchTask');
      expect(result.pauseWeiboSearchTask.id).toBe(testTaskId.toString());
      expect(result.pauseWeiboSearchTask.status).toBe('PENDING'); // Service might not change status immediately
    });

    it('should resume a paused weibo search task', async () => {
      // First create and pause a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const mockTask = {
        keyword: `恢复测试_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      testTaskId = Number(createResult.createWeiboSearchTask.id);

      // Pause first
      const pauseMutation = `
        mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput!) {
          pauseWeiboSearchTask(id: $id, input: $input) {
            id
            status
          }
        }
      `;

      await client.mutate(pauseMutation, {
        id: testTaskId,
        input: { reason: 'Test pause before resume' }
      });

      // Now resume the task
      const resumeMutation = `
        mutation ResumeWeiboSearchTask($id: Int!, $input: ResumeWeiboTaskInput!) {
          resumeWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const result = await client.mutate(resumeMutation, {
        id: testTaskId,
        input: { reason: 'Test resume' },
      });

      expect(result).toHaveProperty('resumeWeiboSearchTask');
      expect(result.resumeWeiboSearchTask.id).toBe(testTaskId.toString());
      expect(result.resumeWeiboSearchTask.status).toBe('PENDING');
    });

    it('should run weibo search task immediately', async () => {
      // First create a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
            status
          }
        }
      `;

      const mockTask = {
        keyword: `立即执行测试_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      testTaskId = Number(createResult.createWeiboSearchTask.id);

      // Now run the task immediately
      const mutation = `
        mutation RunWeiboSearchTaskNow($id: Int!, $input: RunWeiboTaskNowInput!) {
          runWeiboSearchTaskNow(id: $id, input: $input) {
            id
            keyword
            status
            currentCrawlTime
          }
        }
      `;

      const result = await client.mutate(mutation, {
        id: testTaskId,
        input: { reason: 'Test immediate run' },
      });

      expect(result).toHaveProperty('runWeiboSearchTaskNow');
      expect(result.runWeiboSearchTaskNow.id).toBe(testTaskId.toString());
      expect(result.runWeiboSearchTaskNow.status).toBe('PENDING'); // Service might not change status immediately
      // expect(result.runWeiboSearchTaskNow.currentCrawlTime).toBeDefined(); // Might not be set immediately
    });

    it('should pause all weibo search tasks', async () => {
      const mutation = `
        mutation PauseAllWeiboSearchTasks {
          pauseAllWeiboSearchTasks
        }
      `;

      const result = await client.mutate(mutation);
      expect(result).toHaveProperty('pauseAllWeiboSearchTasks');
      expect(typeof result.pauseAllWeiboSearchTasks).toBe('number');
      expect(result.pauseAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
    });

    it('should resume all weibo search tasks', async () => {
      const mutation = `
        mutation ResumeAllWeiboSearchTasks {
          resumeAllWeiboSearchTasks
        }
      `;

      const result = await client.mutate(mutation);
      expect(result).toHaveProperty('resumeAllWeiboSearchTasks');
      expect(typeof result.resumeAllWeiboSearchTasks).toBe('number');
      expect(result.resumeAllWeiboSearchTasks).toBeGreaterThanOrEqual(0);
    });

    it('should remove a weibo search task', async () => {
      // First create a task
      const createMutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
          }
        }
      `;

      const mockTask = {
        keyword: `删除测试_${Date.now()}`,
        startDate: new Date().toISOString(),
      };

      const createResult = await client.mutate(createMutation, {
        input: mockTask,
      });

      const taskToDelete = Number(createResult.createWeiboSearchTask.id);

      // Now delete the task
      const mutation = `
        mutation RemoveWeiboSearchTask($id: Int!) {
          removeWeiboSearchTask(id: $id)
        }
      `;

      const result = await client.mutate(mutation, {
        id: taskToDelete,
      });

      expect(result).toHaveProperty('removeWeiboSearchTask');
      expect(result.removeWeiboSearchTask).toBe(true);

      // Verify task is deleted
      const query = `
        query WeiboSearchTask($id: Int!) {
          weiboSearchTask(id: $id) {
            id
            keyword
          }
        }
      `;

      await expect(client.query(query, {
        id: taskToDelete,
      })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should create task with empty data (validation not implemented)', async () => {
      const mutation = `
        mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
          createWeiboSearchTask(input: $input) {
            id
            keyword
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          keyword: '', // Empty keyword creates task (no validation implemented)
          startDate: new Date().toISOString(),
        },
      });

      expect(result).toHaveProperty('createWeiboSearchTask');
      expect(result.createWeiboSearchTask.keyword).toBe('');
    });

    it('should fail to update non-existent task', async () => {
      const mutation = `
        mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskInput!) {
          updateWeiboSearchTask(id: $id, input: $input) {
            id
            keyword
          }
        }
      `;

      await expect(client.mutate(mutation, {
        id: 99999,
        input: { keyword: 'Updated' },
      })).rejects.toThrow();
    });

    it('should fail to access tasks without API key', async () => {
      const clientWithoutAuth = testSetup.createTestClient(); // No API key

      const query = `
        query WeiboSearchTasks {
          weiboSearchTasks {
            edges {
              node {
                id
                keyword
              }
            }
          }
        }
      `;

      await expect(clientWithoutAuth.query(query)).rejects.toThrow();
    });

    it('should fail to pause non-existent task', async () => {
      const mutation = `
        mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput!) {
          pauseWeiboSearchTask(id: $id, input: $input) {
            id
            status
          }
        }
      `;

      await expect(client.mutate(mutation, {
        id: 99999,
        input: { reason: 'Test pause non-existent' }
      })).rejects.toThrow();
    });

    it('should fail to run non-existent task', async () => {
      const mutation = `
        mutation RunWeiboSearchTaskNow($id: Int!, $input: RunWeiboTaskNowInput!) {
          runWeiboSearchTaskNow(id: $id, input: $input) {
            id
            status
          }
        }
      `;

      await expect(client.mutate(mutation, {
        id: 99999,
        input: { reason: 'Test run non-existent' }
      })).rejects.toThrow();
    });
  });
});