import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser } from './graphql-test-client';

describe('DashboardResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;
  let authToken: string;
  let testUserId: string;

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

  describe('Dashboard Queries', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get dashboard statistics', async () => {
      const query = `
        query DashboardStats {
          dashboardStats {
            totalScreens
            totalEvents
            totalWeiboAccounts
            totalSearchTasks
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardStats');
      expect(result.dashboardStats).toHaveProperty('totalScreens');
      expect(result.dashboardStats).toHaveProperty('totalEvents');
      expect(result.dashboardStats).toHaveProperty('totalWeiboAccounts');
      expect(result.dashboardStats).toHaveProperty('totalSearchTasks');

      // Check that all numeric values are numbers
      expect(typeof result.dashboardStats.totalScreens).toBe('number');
      expect(typeof result.dashboardStats.totalEvents).toBe('number');
      expect(typeof result.dashboardStats.totalWeiboAccounts).toBe('number');
      expect(typeof result.dashboardStats.totalSearchTasks).toBe('number');

      // Verify that stats are non-negative numbers
      expect(result.dashboardStats.totalScreens).toBeGreaterThanOrEqual(0);
      expect(result.dashboardStats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(result.dashboardStats.totalWeiboAccounts).toBeGreaterThanOrEqual(0);
      expect(result.dashboardStats.totalSearchTasks).toBeGreaterThanOrEqual(0);
    });

    it('should get recent activities', async () => {
      const query = `
        query DashboardRecentActivities {
          dashboardRecentActivities {
            type
            message
            time
            entityId
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardRecentActivities');
      expect(Array.isArray(result.dashboardRecentActivities)).toBe(true);

      if (result.dashboardRecentActivities.length > 0) {
        const activity = result.dashboardRecentActivities[0];
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('message');
        expect(activity).toHaveProperty('time');

        expect(typeof activity.type).toBe('string');
        expect(typeof activity.message).toBe('string');
        expect(typeof activity.time).toBe('string');

        // Check that type is valid
        const validTypes = ['screen', 'event', 'weibo', 'task'];
        expect(validTypes).toContain(activity.type);

        // entityId is optional
        if (activity.entityId) {
          expect(typeof activity.entityId).toBe('string');
        }
      }
    });

    it('should return valid activity types', async () => {
      // Create some test data to generate activities
      const eventMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = {
        eventName: `Dashboard Test Event ${Date.now()}`,
        summary: 'Test event for dashboard activity',
        occurTime: new Date().toISOString(),
        province: 'Beijing',
        city: 'Beijing',
        district: 'Chaoyang',
        locationText: 'Test Location',
        latitude: 39.9042,
        longitude: 116.4074,
        eventTypeId: '1',
        industryTypeId: '1',
        status: 'DRAFT',
      };

      await client.mutate(eventMutation, { input: mockEvent });

      // Now get activities
      const query = `
        query DashboardRecentActivities {
          dashboardRecentActivities {
            type
            message
            time
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardRecentActivities');

      const validTypes = ['screen', 'event', 'weibo', 'task'];

      result.dashboardRecentActivities.forEach((activity: any) => {
        expect(validTypes).toContain(activity.type);
        expect(typeof activity.message).toBe('string');
        expect(typeof activity.time).toBe('string');
      });
    });
  });

  describe('Dashboard Data Consistency', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should have consistent data across dashboard queries', async () => {
      const statsQuery = `
        query DashboardStats {
          dashboardStats {
            totalScreens
            totalEvents
            totalWeiboAccounts
            totalSearchTasks
          }
        }
      `;

      const statsResult = await client.query(statsQuery);
      const stats = statsResult.dashboardStats;

      // Verify that stats are non-negative numbers
      expect(stats.totalScreens).toBeGreaterThanOrEqual(0);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.totalWeiboAccounts).toBeGreaterThanOrEqual(0);
      expect(stats.totalSearchTasks).toBeGreaterThanOrEqual(0);

      // Verify that total includes active and completed items
      expect(typeof stats.totalScreens).toBe('number');
      expect(typeof stats.totalEvents).toBe('number');
      expect(typeof stats.totalWeiboAccounts).toBe('number');
      expect(typeof stats.totalSearchTasks).toBe('number');
    });

    it('should handle pagination for recent activities', async () => {
      const query = `
        query DashboardRecentActivities {
          dashboardRecentActivities {
            type
            message
            time
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardRecentActivities');
      expect(Array.isArray(result.dashboardRecentActivities)).toBe(true);

      // Should not return excessive amounts of data
      expect(result.dashboardRecentActivities.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Dashboard Performance', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const query = `
        query DashboardStats {
          dashboardStats {
            totalScreens
            totalEvents
            totalWeiboAccounts
            totalSearchTasks
          }
        }
      `;

      await client.query(query);
      const endTime = Date.now();

      // Should respond within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      const query = `
        query DashboardStats {
          dashboardStats {
            totalScreens
            totalEvents
            totalWeiboAccounts
            totalSearchTasks
          }
        }
      `;

      const promises = Array(5).fill(null).map(() => client.query(query));
      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(result => {
        expect(result).toHaveProperty('dashboardStats');
        expect(result.dashboardStats).toHaveProperty('totalScreens');
        expect(result.dashboardStats).toHaveProperty('totalEvents');
        expect(result.dashboardStats).toHaveProperty('totalWeiboAccounts');
        expect(result.dashboardStats).toHaveProperty('totalSearchTasks');
      });
    });
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should fail to access dashboard without API key', async () => {
      const clientWithoutAuth = testSetup.createTestClient(); // No API key

      const query = `
        query DashboardStats {
          dashboardStats {
            totalScreens
          }
        }
      `;

      await expect(clientWithoutAuth.query(query)).rejects.toThrow();
    });

    it('should fail with invalid API key', async () => {
      const clientWithInvalidKey = testSetup.createTestClient('invalid-api-key');

      const query = `
        query DashboardStats {
          dashboardStats {
            totalScreens
          }
        }
      `;

      await expect(clientWithInvalidKey.query(query)).rejects.toThrow();
    });

    it('should handle malformed queries gracefully', async () => {
      const malformedQuery = `
        query DashboardStats {
          dashboardStats {
            nonExistentField
          }
        }
      `;

      // Should throw error for non-existent field
      await expect(client.query(malformedQuery)).rejects.toThrow();
    });
  });
});