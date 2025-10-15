import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const graphqlRequest = (
  app: INestApplication,
  {
    query,
    variables,
    token,
  }: {
    query: string;
    variables?: Record<string, unknown>;
    token?: string;
  },
) => {
  const httpRequest = request(app.getHttpServer())
    .post('/graphql')
    .send({
      query,
      variables,
    })
    .set('Content-Type', 'application/json');

  if (token) {
    httpRequest.set('Authorization', `Bearer ${token}`);
  }

  return httpRequest;
};

describe('GraphQL Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

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

  it('register mutation creates user and returns tokens', async () => {
    const mutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          accessToken
          refreshToken
          user {
            id
            username
            email
          }
        }
      }
    `;

    const variables = {
      input: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      },
    };

    const response = await graphqlRequest(app, { query: mutation, variables });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.register.user.username).toBe('testuser');
    expect(response.body.data.register.accessToken).toBeDefined();
    expect(response.body.data.register.refreshToken).toBeDefined();

    accessToken = response.body.data.register.accessToken;
    refreshToken = response.body.data.register.refreshToken;
  });

  it('register mutation rejects duplicate username', async () => {
    const mutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          accessToken
          refreshToken
        }
      }
    `;

    const variables = {
      input: {
        username: 'testuser',
        email: 'another@example.com',
        password: 'password123',
      },
    };

    const response = await graphqlRequest(app, { query: mutation, variables });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors?.[0]?.message).toContain('用户名已存在');
  });

  it('login mutation returns tokens', async () => {
    const mutation = `
      mutation Login($input: LoginDto!) {
        login(input: $input) {
          accessToken
          refreshToken
        }
      }
    `;

    const variables = {
      input: {
        usernameOrEmail: 'testuser',
        password: 'password123',
      },
    };

    const response = await graphqlRequest(app, { query: mutation, variables });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.login.accessToken).toBeDefined();
    expect(response.body.data.login.refreshToken).toBeDefined();
  });

  it('login mutation rejects wrong password', async () => {
    const mutation = `
      mutation Login($input: LoginDto!) {
        login(input: $input) {
          accessToken
        }
      }
    `;

    const response = await graphqlRequest(app, {
      query: mutation,
      variables: {
        input: {
          usernameOrEmail: 'testuser',
          password: 'wrong-password',
        },
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors?.[0]?.message).toContain('用户名或密码不正确');
  });

  it('me query returns current user when authorized', async () => {
    const query = `
      query Me {
        me {
          id
          username
          email
        }
      }
    `;

    const response = await graphqlRequest(app, { query, token: accessToken });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.me.username).toBe('testuser');
  });

  it('me query rejects missing token', async () => {
    const query = `
      query Me {
        me {
          id
        }
      }
    `;

    const response = await graphqlRequest(app, { query });
    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors?.[0]?.message).toContain('未授权');
  });

  it('refreshToken mutation provides new tokens', async () => {
    const mutation = `
      mutation Refresh($input: RefreshTokenDto!) {
        refreshToken(input: $input) {
          accessToken
          refreshToken
        }
      }
    `;

    const response = await graphqlRequest(app, {
      query: mutation,
      variables: { input: { refreshToken } },
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.refreshToken.accessToken).toBeDefined();
    expect(response.body.data.refreshToken.refreshToken).toBeDefined();

    accessToken = response.body.data.refreshToken.accessToken;
    refreshToken = response.body.data.refreshToken.refreshToken;
  });

  it('logout mutation invalidates token', async () => {
    const mutation = `
      mutation Logout {
        logout
      }
    `;

    const response = await graphqlRequest(app, {
      query: mutation,
      token: accessToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.logout).toBe(true);

    const meResponse = await graphqlRequest(app, {
      query: `
        query Me {
          me {
            id
          }
        }
      `,
      token: accessToken,
    });

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data).toBeNull();
    expect(meResponse.body.errors?.[0]?.message).toContain('未授权');
  });
});
