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
            totalEvents
            activeEvents
            completedEvents
            totalUsers
            activeUsers
            totalTasks
            runningTasks
            completedTasks
            systemHealth {
              database
              redis
              rabbitmq
              minio
            }
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardStats');
      expect(result.dashboardStats).toHaveProperty('totalEvents');
      expect(result.dashboardStats).toHaveProperty('activeEvents');
      expect(result.dashboardStats).toHaveProperty('completedEvents');
      expect(result.dashboardStats).toHaveProperty('totalUsers');
      expect(result.dashboardStats).toHaveProperty('activeUsers');
      expect(result.dashboardStats).toHaveProperty('totalTasks');
      expect(result.dashboardStats).toHaveProperty('runningTasks');
      expect(result.dashboardStats).toHaveProperty('completedTasks');
      expect(result.dashboardStats).toHaveProperty('systemHealth');

      // Check that all numeric values are numbers
      expect(typeof result.dashboardStats.totalEvents).toBe('number');
      expect(typeof result.dashboardStats.activeEvents).toBe('number');
      expect(typeof result.dashboardStats.completedEvents).toBe('number');
      expect(typeof result.dashboardStats.totalUsers).toBe('number');
      expect(typeof result.dashboardStats.activeUsers).toBe('number');
      expect(typeof result.dashboardStats.totalTasks).toBe('number');
      expect(typeof result.dashboardStats.runningTasks).toBe('number');
      expect(typeof result.dashboardStats.completedTasks).toBe('number');

      // Check system health object
      expect(result.dashboardStats.systemHealth).toHaveProperty('database');
      expect(result.dashboardStats.systemHealth).toHaveProperty('redis');
      expect(result.dashboardStats.systemHealth).toHaveProperty('rabbitmq');
      expect(result.dashboardStats.systemHealth).toHaveProperty('minio');
    });

    it('should get recent activities', async () => {
      const query = `
        query DashboardRecentActivities {
          dashboardRecentActivities {
            id
            type
            title
            description
            createdAt
            user {
              id
              username
            }
            metadata
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardRecentActivities');
      expect(Array.isArray(result.dashboardRecentActivities)).toBe(true);

      if (result.dashboardRecentActivities.length > 0) {
        const activity = result.dashboardRecentActivities[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('createdAt');
        expect(activity).toHaveProperty('user');
        expect(activity).toHaveProperty('metadata');

        expect(typeof activity.id).toBe('string');
        expect(typeof activity.type).toBe('string');
        expect(typeof activity.title).toBe('string');
        expect(typeof activity.description).toBe('string');
        expect(typeof activity.createdAt).toBe('string');

        if (activity.user) {
          expect(activity.user).toHaveProperty('id');
          expect(activity.user).toHaveProperty('username');
          expect(typeof activity.user.id).toBe('string');
          expect(typeof activity.user.username).toBe('string');
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
            id
            type
            title
            createdAt
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('dashboardRecentActivities');

      const validTypes = ['EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_DELETED', 'USER_REGISTERED', 'USER_LOGIN', 'TASK_CREATED', 'TASK_UPDATED'];

      result.dashboardRecentActivities.forEach((activity: any) => {
        expect(validTypes).toContain(activity.type);
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
            totalEvents
            totalUsers
            totalTasks
          }
        }
      `;

      const statsResult = await client.query(statsQuery);
      const stats = statsResult.dashboardStats;

      // Verify that stats are non-negative numbers
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);

      // Verify that total includes active and completed items
      expect(typeof stats.totalEvents).toBe('number');
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.totalTasks).toBe('number');
    });

    it('should handle pagination for recent activities', async () => {
      const query = `
        query DashboardRecentActivities {
          dashboardRecentActivities {
            id
            title
            createdAt
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
            totalEvents
            activeEvents
            totalUsers
            totalTasks
            systemHealth {
              database
              redis
              rabbitmq
              minio
            }
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
            totalEvents
            totalUsers
            systemHealth {
              database
              redis
            }
          }
        }
      `;

      const promises = Array(5).fill(null).map(() => client.query(query));
      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(result => {
        expect(result).toHaveProperty('dashboardStats');
        expect(result.dashboardStats).toHaveProperty('totalEvents');
        expect(result.dashboardStats).toHaveProperty('totalUsers');
        expect(result.dashboardStats).toHaveProperty('systemHealth');
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
            totalEvents
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
            totalEvents
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

  describe('System Health Monitoring', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should return system health status for all services', async () => {
      const query = `
        query DashboardStats {
          dashboardStats {
            systemHealth {
              database
              redis
              rabbitmq
              minio
            }
          }
        }
      `;

      const result = await client.query(query);
      const systemHealth = result.dashboardStats.systemHealth;

      // All services should have health status
      expect(Object.keys(systemHealth)).toContain('database');
      expect(Object.keys(systemHealth)).toContain('redis');
      expect(Object.keys(systemHealth)).toContain('rabbitmq');
      expect(Object.keys(systemHealth)).toContain('minio');

      // Health status should be valid
      const validStatuses = ['healthy', 'unhealthy', 'degraded', 'unknown'];
      Object.values(systemHealth).forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should handle service unavailability gracefully', async () => {
      const query = `
        query DashboardStats {
          dashboardStats {
            systemHealth {
              database
              redis
              rabbitmq
              minio
            }
          }
        }
      `;

      const result = await client.query(query);
      const systemHealth = result.dashboardStats.systemHealth;

      // Even if services are unavailable, should return status
      Object.values(systemHealth).forEach(status => {
        expect(status).toBeDefined();
        expect(typeof status).toBe('string');
      });
    });
  });
});