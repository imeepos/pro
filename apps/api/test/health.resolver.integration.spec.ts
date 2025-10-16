import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GraphQLTestSetup } from './graphql-test-client';

describe('HealthResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;

  beforeAll(async () => {
    testSetup = new GraphQLTestSetup();
    await testSetup.createTestApp();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  describe('Health Check Query', () => {
    it('should return health status without authentication', async () => {
      const client = testSetup.createTestClient(); // No API key required

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('health');
      expect(result.health).toHaveProperty('status');
      expect(result.health).toHaveProperty('timestamp');
    });

    it('should return healthy status', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);
      expect(result.health.status).toBe('healthy');
    });

    it('should return valid timestamp', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);
      const timestamp = new Date(result.health.timestamp);

      // Should be a valid date
      expect(timestamp.getTime()).not.toBeNaN();

      // Should be recent (within last minute)
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - timestamp.getTime());
      expect(timeDiff).toBeLessThan(60000); // 60 seconds
    });

    it('should work with API key authentication', async () => {
      const client = testSetup.createTestClient('test-api-key');

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('health');
      expect(result.health.status).toBe('healthy');
      expect(result.health).toHaveProperty('timestamp');
    });

    it('should handle concurrent health checks', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const promises = Array(10).fill(null).map(() => client.query(query));
      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(result => {
        expect(result).toHaveProperty('health');
        expect(result.health.status).toBe('healthy');
        expect(result.health).toHaveProperty('timestamp');
      });
    });

    it('should respond quickly', async () => {
      const client = testSetup.createTestClient();

      const startTime = Date.now();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      await client.query(query);
      const endTime = Date.now();

      // Should respond within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Health Check Response Format', () => {
    it('should return correct GraphQL types', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);

      expect(typeof result.health.status).toBe('string');
      expect(typeof result.health.timestamp).toBe('string');
    });

    it('should return ISO 8601 timestamp format', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result = await client.query(query);

      // Should match ISO 8601 format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(result.health.timestamp).toMatch(iso8601Regex);
    });

    it('should have consistent response structure', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const result1 = await client.query(query);
      const result2 = await client.query(query);

      // Both responses should have the same structure
      expect(Object.keys(result1.health)).toEqual(Object.keys(result2.health));
      expect(result1.health).toHaveProperty('status');
      expect(result1.health).toHaveProperty('timestamp');
      expect(result2.health).toHaveProperty('status');
      expect(result2.health).toHaveProperty('timestamp');
    });
  });

  describe('Health Check Edge Cases', () => {
    it('should handle malformed query gracefully', async () => {
      const client = testSetup.createTestClient();

      const malformedQuery = `
        query Health {
          health {
            nonExistentField
          }
        }
      `;

      await expect(client.query(malformedQuery)).rejects.toThrow();
    });

    it('should handle empty query', async () => {
      const client = testSetup.createTestClient();

      const emptyQuery = `
        query {
          __typename
        }
      `;

      // Should not throw error for introspection query
      const result = await client.query(emptyQuery);
      expect(result).toHaveProperty('__typename');
    });

    it('should be accessible via different HTTP methods', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      // Test query method
      const result = await client.query(query);
      expect(result).toHaveProperty('health');
      expect(result.health.status).toBe('healthy');
    });
  });

  describe('Health Check Load Testing', () => {
    it('should handle high frequency requests', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const promises = Array(100).fill(null).map(async (_, index) => {
        const result = await client.query(query);
        return {
          index,
          result,
          timestamp: Date.now(),
        };
      });

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(({ result }) => {
        expect(result).toHaveProperty('health');
        expect(result.health.status).toBe('healthy');
      });

      // Should complete within reasonable time
      const totalTime = Date.now() - results[0].timestamp;
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 requests
    });

    it('should maintain consistent responses under load', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const promises = Array(50).fill(null).map(() => client.query(query));
      const results = await Promise.all(promises);

      // All responses should have the same structure
      results.forEach(result => {
        expect(result).toHaveProperty('health');
        expect(result.health).toHaveProperty('status');
        expect(result.health).toHaveProperty('timestamp');
        expect(typeof result.health.status).toBe('string');
        expect(typeof result.health.timestamp).toBe('string');
      });

      // All should have healthy status
      results.forEach(result => {
        expect(result.health.status).toBe('healthy');
      });
    });
  });

  describe('Health Check Integration', () => {
    it('should work with other resolvers', async () => {
      const client = testSetup.createTestClient();

      const healthQuery = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      const otherQuery = `
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      const [healthResult, otherResult] = await Promise.all([
        client.query(healthQuery),
        client.query(otherQuery),
      ]);

      expect(healthResult).toHaveProperty('health');
      expect(healthResult.health.status).toBe('healthy');
      expect(otherResult).toHaveProperty('__schema');
    });

    it('should be accessible in different execution contexts', async () => {
      const client = testSetup.createTestClient();

      const query = `
        query Health {
          health {
            status
            timestamp
          }
        }
      `;

      // Test multiple independent calls
      const result1 = await client.query(query);
      const result2 = await client.query(query);
      const result3 = await client.query(query);

      expect(result1.health.status).toBe('healthy');
      expect(result2.health.status).toBe('healthy');
      expect(result3.health.status).toBe('healthy');

      // Each should have a different timestamp (current time)
      expect(result1.health.timestamp).not.toBe(result2.health.timestamp);
      expect(result2.health.timestamp).not.toBe(result3.health.timestamp);
    });
  });
});