import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GraphQL Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns healthy status with timestamp', async () => {
    const query = /* GraphQL */ `
      query Health {
        health {
          status
          timestamp
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.health.status).toBe('healthy');
    expect(new Date(response.body.data.health.timestamp).toString()).not.toBe('Invalid Date');
  });
});
