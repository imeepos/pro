import { GraphQLTestSetup, TEST_API_KEY } from './graphql-test-client';
import { BugStatus, BugPriority } from '@pro/types';

describe('BugResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;
  let client: any;

  beforeAll(async () => {
    testSetup = new GraphQLTestSetup();
    await testSetup.createTestApp();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(() => {
    client = testSetup.createTestClient(TEST_API_KEY);
  });

  describe('Mutations', () => {
    let createdBugId: string;

    it('should create a bug successfully', async () => {
      const mutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
            title
            description
            status
            priority
            category
            reporterId
            assigneeId
            createdAt
            updatedAt
          }
        }
      `;

      const input = {
        title: `Integration Test Bug ${Date.now()}`,
        description: 'This is a test bug created for integration testing',
        priority: BugPriority.HIGH,
        category: 'functional',
        assigneeId: 'test-user-123',
        stepsToReproduce: '1. Run test\n2. Observe behavior\n3. Bug appears',
        expectedBehavior: 'Test should pass without errors',
        actualBehavior: 'Test fails with assertion error',
        reproductionRate: 'always',
        estimatedHours: 2,
      };

      const result = await client.mutate(mutation, { input });

      expect(result).toHaveProperty('createBug');
      expect(result.createBug).toMatchObject({
        title: input.title,
        description: input.description,
        status: BugStatus.OPEN,
        priority: input.priority,
        category: input.category,
        assigneeId: input.assigneeId,
        stepsToReproduce: input.stepsToReproduce,
        expectedBehavior: input.expectedBehavior,
        actualBehavior: input.actualBehavior,
        reproductionRate: input.reproductionRate,
        estimatedHours: input.estimatedHours,
      });
      expect(result.createBug.id).toBeDefined();
      expect(result.createBug.createdAt).toBeDefined();
      expect(result.createBug.updatedAt).toBeDefined();

      createdBugId = result.createBug.id;
    });

    it('should update a bug successfully', async () => {
      const mutation = `
        mutation UpdateBug($id: ID!, $input: UpdateBugInput!) {
          updateBug(id: $id, input: $input) {
            id
            title
            description
            status
            priority
            assigneeId
            updatedAt
          }
        }
      `;

      const input = {
        title: 'Updated Bug Title',
        description: 'Updated bug description',
        priority: BugPriority.MEDIUM,
        assigneeId: 'test-user-456',
        actualHours: 1.5,
      };

      const result = await client.mutate(mutation, {
        id: createdBugId,
        input,
      });

      expect(result).toHaveProperty('updateBug');
      expect(result.updateBug).toMatchObject({
        id: createdBugId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        actualHours: input.actualHours,
      });
      expect(result.updateBug.updatedAt).toBeDefined();
    });

    it('should update bug status successfully', async () => {
      const mutation = `
        mutation UpdateBugStatus($id: ID!, $input: UpdateBugStatusInput!) {
          updateBugStatus(id: $id, input: $input) {
            id
            status
            updatedAt
          }
        }
      `;

      const input = {
        status: BugStatus.IN_PROGRESS,
        comment: 'Started working on this bug',
      };

      const result = await client.mutate(mutation, {
        id: createdBugId,
        input,
      });

      expect(result).toHaveProperty('updateBugStatus');
      expect(result.updateBugStatus).toMatchObject({
        id: createdBugId,
        status: input.status,
      });
    });

    it('should assign bug to user successfully', async () => {
      const mutation = `
        mutation AssignBug($id: ID!, $input: AssignBugInput!) {
          assignBug(id: $id, input: $input) {
            id
            assigneeId
            updatedAt
          }
        }
      `;

      const input = {
        assigneeId: 'test-user-789',
      };

      const result = await client.mutate(mutation, {
        id: createdBugId,
        input,
      });

      expect(result).toHaveProperty('assignBug');
      expect(result.assignBug).toMatchObject({
        id: createdBugId,
        assigneeId: input.assigneeId,
      });
    });

    it('should add comment to bug successfully', async () => {
      const mutation = `
        mutation AddBugComment($bugId: ID!, $input: CreateBugCommentInput!) {
          addBugComment(bugId: $bugId, input: $input) {
            id
            bugId
            content
            authorName
            createdAt
            updatedAt
          }
        }
      `;

      const input = {
        content: 'This is a test comment added via GraphQL mutation',
      };

      const result = await client.mutate(mutation, {
        bugId: createdBugId,
        input,
      });

      expect(result).toHaveProperty('addBugComment');
      expect(result.addBugComment).toMatchObject({
        bugId: createdBugId,
        content: input.content,
        authorName: 'System',
      });
      expect(result.addBugComment.id).toBeDefined();
      expect(result.addBugComment.createdAt).toBeDefined();
    });

    it('should remove bug successfully', async () => {
      const mutation = `
        mutation RemoveBug($id: ID!) {
          removeBug(id: $id)
        }
      `;

      const result = await client.mutate(mutation, { id: createdBugId });

      expect(result).toHaveProperty('removeBug');
      expect(result.removeBug).toBe(true);
    });

    it('should fail to remove non-existent bug', async () => {
      const mutation = `
        mutation RemoveBug($id: ID!) {
          removeBug(id: $id)
        }
      `;

      await expect(client.mutate(mutation, { id: 'non-existent-id' }))
        .rejects.toThrow();
    });

    describe('Validation Tests', () => {
      it('should fail to create bug without title', async () => {
        const mutation = `
          mutation CreateBug($input: CreateBugInput!) {
            createBug(input: $input) {
              id
              title
            }
          }
        `;

        const input = {
          description: 'Bug without title',
        };

        await expect(client.mutate(mutation, { input }))
          .rejects.toThrow();
      });

      it('should fail to update bug with invalid status', async () => {
        const mutation = `
          mutation UpdateBug($id: ID!, $input: UpdateBugInput!) {
            updateBug(id: $id, input: $input) {
              id
              status
            }
          }
        `;

        const input = {
          status: 'INVALID_STATUS',
        };

        await expect(client.mutate(mutation, {
          id: 'some-id',
          input,
        })).rejects.toThrow();
      });

      it('should fail to create comment without content', async () => {
        const mutation = `
          mutation AddBugComment($bugId: ID!, $input: CreateBugCommentInput!) {
            addBugComment(bugId: $bugId, input: $input) {
              id
              content
            }
          }
        `;

        const input = {
          content: '',
        };

        await expect(client.mutate(mutation, {
          bugId: 'some-id',
          input,
        })).rejects.toThrow();
      });
    });
  });

  describe('Queries', () => {
    let testBugId: string;
    let testCommentId: string;

    beforeAll(async () => {
      // Create a test bug for query tests
      const createMutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
            title
            status
            priority
          }
        }
      `;

      const createResult = await client.mutate(createMutation, {
        input: {
          title: `Query Test Bug ${Date.now()}`,
          description: 'Bug for testing queries',
          priority: BugPriority.MEDIUM,
        },
      });

      testBugId = createResult.createBug.id;

      // Add a comment for testing
      const commentMutation = `
        mutation AddBugComment($bugId: ID!, $input: CreateBugCommentInput!) {
          addBugComment(bugId: $bugId, input: $input) {
            id
            content
          }
        }
      `;

      const commentResult = await client.mutate(commentMutation, {
        bugId: testBugId,
        input: {
          content: 'Test comment for query testing',
        },
      });

      testCommentId = commentResult.addBugComment.id;
    });

    afterAll(async () => {
      // Clean up test data
      const deleteMutation = `
        mutation RemoveBug($id: ID!) {
          removeBug(id: $id)
        }
      `;

      try {
        await client.mutate(deleteMutation, { id: testBugId });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should get bug by id successfully', async () => {
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
            description
            status
            priority
            category
            reporterId
            assigneeId
            createdAt
            updatedAt
          }
        }
      `;

      const result = await client.query(query, { id: testBugId });

      expect(result).toHaveProperty('bug');
      expect(result.bug).toMatchObject({
        id: testBugId,
        title: expect.stringContaining('Query Test Bug'),
        description: 'Bug for testing queries',
        status: BugStatus.OPEN,
        priority: BugPriority.MEDIUM,
      });
      expect(result.bug.createdAt).toBeDefined();
      expect(result.bug.updatedAt).toBeDefined();
    });

    it('should return null for non-existent bug', async () => {
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
          }
        }
      `;

      await expect(client.query(query, { id: 'non-existent-id' }))
        .rejects.toThrow();
    });

    it('should get bugs list with default pagination', async () => {
      const query = `
        query GetBugs {
          bugs {
            bugs {
              id
              title
              status
              priority
              createdAt
            }
            total
          }
        }
      `;

      const result = await client.query(query);

      expect(result).toHaveProperty('bugs');
      expect(result.bugs).toHaveProperty('bugs');
      expect(result.bugs).toHaveProperty('total');
      expect(Array.isArray(result.bugs.bugs)).toBe(true);
      expect(typeof result.bugs.total).toBe('number');
    });

    it('should get bugs list with filters', async () => {
      const query = `
        query GetBugs($filters: BugFiltersInput) {
          bugs(filters: $filters) {
            bugs {
              id
              title
              status
              priority
            }
            total
          }
        }
      `;

      const filters = {
        page: 1,
        limit: 5,
        status: [BugStatus.OPEN],
        priority: [BugPriority.MEDIUM],
        search: 'Query Test',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await client.query(query, { filters });

      expect(result).toHaveProperty('bugs');
      expect(result.bugs.bugs).toHaveLength.lessThanOrEqual(5);
      expect(result.bugs.total).toBeGreaterThanOrEqual(0);
    });

    it('should get bug statistics', async () => {
      const query = `
        query GetBugStatistics {
          bugStatistics {
            total
            byStatus {
              open
              inProgress
              resolved
              closed
            }
            byPriority {
              low
              medium
              high
              critical
            }
          }
        }
      `;

      const result = await client.query(query);

      expect(result).toHaveProperty('bugStatistics');
      expect(result.bugStatistics).toHaveProperty('total');
      expect(result.bugStatistics).toHaveProperty('byStatus');
      expect(result.bugStatistics).toHaveProperty('byPriority');
      expect(typeof result.bugStatistics.total).toBe('number');
      expect(typeof result.bugStatistics.byStatus.open).toBe('number');
      expect(typeof result.bugStatistics.byPriority.medium).toBe('number');
    });

    it('should get bug comments', async () => {
      const query = `
        query GetBugComments($bugId: ID!) {
          bugComments(bugId: $bugId) {
            id
            bugId
            content
            authorName
            createdAt
            updatedAt
          }
        }
      `;

      const result = await client.query(query, { bugId: testBugId });

      expect(result).toHaveProperty('bugComments');
      expect(Array.isArray(result.bugComments)).toBe(true);
      expect(result.bugComments.length).toBeGreaterThan(0);
      expect(result.bugComments[0]).toMatchObject({
        bugId: testBugId,
        content: 'Test comment for query testing',
        authorName: 'System',
      });
      expect(result.bugComments[0].createdAt).toBeDefined();
    });

    it('should return empty array for bug with no comments', async () => {
      // Create a bug without comments
      const createMutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
          }
        }
      `;

      const createResult = await client.mutate(createMutation, {
        input: {
          title: `Empty Comments Bug ${Date.now()}`,
          description: 'Bug with no comments',
        },
      });

      const query = `
        query GetBugComments($bugId: ID!) {
          bugComments(bugId: $bugId) {
            id
            content
          }
        }
      `;

      const result = await client.query(query, {
        bugId: createResult.createBug.id,
      });

      expect(result.bugComments).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid UUID format', async () => {
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
          }
        }
      `;

      await expect(client.query(query, { id: 'invalid-uuid' }))
        .rejects.toThrow(/无效的ID格式|Invalid UUID format/);
    });

    it('should handle common error values (route confusion)', async () => {
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
          }
        }
      `;

      await expect(client.query(query, { id: 'statistics' }))
        .rejects.toThrow(/路由混淆|route confusion/);
    });

    it('should handle empty ID', async () => {
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
          }
        }
      `;

      await expect(client.query(query, { id: '' }))
        .rejects.toThrow(/不能为空|empty/);
    });

    it('should handle mutation without authentication', async () => {
      const unauthenticatedClient = testSetup.createTestClient();
      const mutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
            title
          }
        }
      `;

      await expect(unauthenticatedClient.mutate(mutation, {
        input: {
          title: 'Test Bug',
          description: 'Test Description',
        },
      })).rejects.toThrow();
    });

    it('should handle query without authentication', async () => {
      const unauthenticatedClient = testSetup.createTestClient();
      const query = `
        query GetBugs {
          bugs {
            bugs {
              id
              title
            }
            total
          }
        }
      `;

      await expect(unauthenticatedClient.query(query))
        .rejects.toThrow();
    });
  });

  describe('Complex Workflows', () => {
    it('should handle complete bug lifecycle', async () => {
      let bugId: string;

      // 1. Create bug
      const createMutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
            title
            status
          }
        }
      `;

      const createResult = await client.mutate(createMutation, {
        input: {
          title: `Lifecycle Test Bug ${Date.now()}`,
          description: 'Testing complete bug lifecycle',
          priority: BugPriority.HIGH,
        },
      });

      bugId = createResult.createBug.id;
      expect(createResult.createBug.status).toBe(BugStatus.OPEN);

      // 2. Add comment
      const commentMutation = `
        mutation AddBugComment($bugId: ID!, $input: CreateBugCommentInput!) {
          addBugComment(bugId: $bugId, input: $input) {
            id
            content
          }
        }
      `;

      await client.mutate(commentMutation, {
        bugId,
        input: {
          content: 'Initial comment on bug',
        },
      });

      // 3. Update status to in progress
      const statusMutation = `
        mutation UpdateBugStatus($id: ID!, $input: UpdateBugStatusInput!) {
          updateBugStatus(id: $id, input: $input) {
            id
            status
          }
        }
      `;

      const statusResult = await client.mutate(statusMutation, {
        id: bugId,
        input: {
          status: BugStatus.IN_PROGRESS,
          comment: 'Started working on this issue',
        },
      });

      expect(statusResult.updateBugStatus.status).toBe(BugStatus.IN_PROGRESS);

      // 4. Assign bug
      const assignMutation = `
        mutation AssignBug($id: ID!, $input: AssignBugInput!) {
          assignBug(id: $id, input: $input) {
            id
            assigneeId
          }
        }
      `;

      const assignResult = await client.mutate(assignMutation, {
        id: bugId,
        input: {
          assigneeId: 'test-developer-123',
        },
      });

      expect(assignResult.assignBug.assigneeId).toBe('test-developer-123');

      // 5. Update status to resolved
      const resolveResult = await client.mutate(statusMutation, {
        id: bugId,
        input: {
          status: BugStatus.RESOLVED,
          comment: 'Bug has been fixed and tested',
        },
      });

      expect(resolveResult.updateBugStatus.status).toBe(BugStatus.RESOLVED);

      // 6. Verify bug details
      const query = `
        query GetBug($id: ID!) {
          bug(id: $id) {
            id
            title
            status
            assigneeId
          }
        }
      `;

      const finalResult = await client.query(query, { id: bugId });

      expect(finalResult.bug).toMatchObject({
        id: bugId,
        status: BugStatus.RESOLVED,
        assigneeId: 'test-developer-123',
      });

      // 7. Clean up
      const deleteMutation = `
        mutation RemoveBug($id: ID!) {
          removeBug(id: $id)
        }
      `;

      await client.mutate(deleteMutation, { id: bugId });
    });

    it('should handle concurrent operations', async () => {
      // Create multiple bugs concurrently
      const createMutation = `
        mutation CreateBug($input: CreateBugInput!) {
          createBug(input: $input) {
            id
            title
          }
        }
      `;

      const bugPromises = Array(3).fill(null).map((_, index) =>
        client.mutate(createMutation, {
          input: {
            title: `Concurrent Bug ${index + 1} - ${Date.now()}`,
            description: `Testing concurrent operations - bug ${index + 1}`,
            priority: BugPriority.MEDIUM,
          },
        })
      );

      const results = await Promise.all(bugPromises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.createBug.title).toContain(`Concurrent Bug ${index + 1}`);
        expect(result.createBug.id).toBeDefined();
      });

      // Clean up concurrently
      const deleteMutation = `
        mutation RemoveBug($id: ID!) {
          removeBug(id: $id)
        }
      `;

      const deletePromises = results.map(result =>
        client.mutate(deleteMutation, { id: result.createBug.id })
      );

      await Promise.all(deletePromises);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large bug list efficiently', async () => {
      const query = `
        query GetBugs($filters: BugFiltersInput) {
          bugs(filters: $filters) {
            bugs {
              id
              title
              status
              priority
              createdAt
            }
            total
          }
        }
      `;

      const startTime = Date.now();
      const result = await client.query(query, {
        filters: {
          limit: 50,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });
      const endTime = Date.now();

      expect(result).toHaveProperty('bugs');
      expect(result.bugs.bugs).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle complex filter queries', async () => {
      const query = `
        query GetBugs($filters: BugFiltersInput) {
          bugs(filters: $filters) {
            bugs {
              id
              title
              status
              priority
              assigneeId
              reporterId
              createdAt
              updatedAt
            }
            total
          }
        }
      `;

      const complexFilters = {
        status: [BugStatus.OPEN, BugStatus.IN_PROGRESS],
        priority: [BugPriority.HIGH, BugPriority.CRITICAL],
        search: 'test',
        sortBy: 'priority',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      const startTime = Date.now();
      const result = await client.query(query, {
        filters: complexFilters,
      });
      const endTime = Date.now();

      expect(result.bugs.bugs).toBeDefined();
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});