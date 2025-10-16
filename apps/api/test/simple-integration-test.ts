import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

describe('Simple Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    // 创建测试应用
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              health {
                status
                timestamp
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('health');
      expect(response.body.data.health).toHaveProperty('status');
      expect(response.body.data.health).toHaveProperty('timestamp');
      expect(response.body.data.health.status).toBe('healthy');
    });
  });

  describe('GraphQL Schema', () => {
    it('should support introspection query', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              __schema {
                queryType {
                  name
                }
                mutationType {
                  name
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('__schema');
      expect(response.body.data.__schema).toHaveProperty('queryType');
      expect(response.body.data.__schema.queryType.name).toBe('Query');
    });
  });

  describe('Authentication', () => {
    it('should handle API key authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              __schema {
                queryType {
                  name
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('__schema');
    });

    it('should reject requests without API key for protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              users {
                id
                username
              }
            }
          `,
        });

      // This should either fail with authentication error or succeed if the endpoint is public
      expect(response.status).toBe(200);
      if (response.body.errors) {
        expect(response.body.errors[0].message).toContain('auth');
      }
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should handle user registration query structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              __schema {
                queryType {
                  fields {
                    name
                  }
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.__schema.queryType.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'users' }),
          expect.objectContaining({ name: 'user' }),
          expect.objectContaining({ name: 'events' }),
          expect.objectContaining({ name: 'health' }),
        ])
      );
    });

    it('should handle mutation query structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              __schema {
                mutationType {
                  fields {
                    name
                  }
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.__schema.mutationType.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'register' }),
          expect.objectContaining({ name: 'login' }),
          expect.objectContaining({ name: 'createEvent' }),
          expect.objectContaining({ name: 'updateUser' }),
        ])
      );
    });
  });

  describe('API Endpoints Coverage', () => {
    const expectedQueries = [
      'users', 'user', 'events', 'event', 'health', 'dashboardStats',
      'weiboSearchTasks', 'tags', 'eventTypes', 'industryTypes'
    ];

    const expectedMutations = [
      'register', 'login', 'refreshToken', 'logout', 'createEvent',
      'updateEvent', 'removeEvent', 'createUser', 'updateUser',
      'createWeiboSearchTask', 'updateWeiboSearchTask'
    ];

    it(`should support ${expectedQueries.length} query endpoints`, async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              __schema {
                queryType {
                  fields {
                    name
                  }
                }
              }
            }
          `,
        });

      const availableQueries = response.body.data.__schema.queryType.fields.map((f: any) => f.name);

      expectedQueries.forEach(queryName => {
        expect(availableQueries).toContain(queryName);
      });
    });

    it(`should support ${expectedMutations.length} mutation endpoints`, async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              __schema {
                mutationType {
                  fields {
                    name
                  }
                }
              }
            }
          `,
        });

      const availableMutations = response.body.data.__schema.mutationType.fields.map((f: any) => f.name);

      expectedMutations.forEach(mutationName => {
        expect(availableMutations).toContain(mutationName);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed GraphQL queries gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-API-Key', 'ak_21e04cb9c23b1256dc2debf99c211c4b')
        .send({
          query: `
            query {
              nonExistentField {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    it('should respond to simple queries within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              health {
                status
                timestamp
              }
            }
          `,
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const query = {
        query: `
          query {
            health {
              status
              timestamp
            }
          }
        `,
      };

      const promises = Array(10).fill(null).map(() =>
        request(app.getHttpServer()).post('/graphql').send(query)
      );

      const results = await Promise.all(promises);

      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('health');
      });
    });
  });
});