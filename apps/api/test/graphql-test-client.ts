import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

export interface GraphQLTestClient {
  query: (query: string, variables?: any) => Promise<any>;
  mutate: (mutation: string, variables?: any) => Promise<any>;
}

export class GraphQLTestSetup {
  private app: INestApplication;

  async createTestApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleRef.createNestApplication();
    await this.app.init();
    return this.app;
  }

  createTestClient(apiKey?: string): GraphQLTestClient {
    const headers: Record<string, string> = {};

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return {
      query: async (query: string, variables?: any) => {
        try {
          // 使用正确的 supertest 语法
          const response = await request(this.app.getHttpServer())
            .post('/graphql')
            .set(headers)
            .send({
              query,
              variables,
            });

          if (response.body.errors) {
            throw new Error(`GraphQL Query Error: ${response.body.errors.map((e: any) => e.message).join(', ')}`);
          }

          return response.body.data;
        } catch (error: any) {
          throw new Error(`GraphQL Query Error: ${error.message}`);
        }
      },

      mutate: async (mutation: string, variables?: any) => {
        try {
          const response = await request(this.app.getHttpServer())
            .post('/graphql')
            .set(headers)
            .send({
              query: mutation,
              variables,
            });

          if (response.body.errors) {
            throw new Error(`GraphQL Mutation Error: ${response.body.errors.map((e: any) => e.message).join(', ')}`);
          }

          return response.body.data;
        } catch (error: any) {
          throw new Error(`GraphQL Mutation Error: ${error.message}`);
        }
      },
    };
  }

  async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}

export const TEST_API_KEY = 'ak_21e04cb9c23b1256dc2debf99c211c4b';

export const createMockUser = () => ({
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'testPassword123',
});

export const createMockEvent = () => ({
  eventName: `Test Event ${Date.now()}`,
  summary: 'Test event description',
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
});