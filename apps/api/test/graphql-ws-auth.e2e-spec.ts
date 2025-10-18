import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthModule } from '../src/auth/auth.module';
import { GraphqlWsAuthService } from '../src/auth/services/graphql-ws-auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@pro/types';

describe('GraphQL WebSocket Authentication (e2e)', () => {
  let app: INestApplication;
  let wsAuthService: GraphqlWsAuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
          driver: ApolloDriver,
          useFactory: () => ({
            autoSchemaFile: false,
            sortSchema: true,
            path: '/graphql',
            graphiql: false,
            introspection: true,
            subscriptions: {
              'graphql-ws': {
                onConnect: async (context) => {
                  return context;
                },
              },
            },
          }),
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    wsAuthService = moduleFixture.get<GraphqlWsAuthService>(GraphqlWsAuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WebSocket Connection Authentication', () => {
    let validToken: string;
    let expiredToken: string;

    beforeAll(async () => {
      // 创建有效的 JWT token
      const payload: JwtPayload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
      };

      validToken = jwtService.sign(payload, {
        secret: configService.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
      });

      // 创建过期的 token
      const expiredPayload: JwtPayload = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1小时前过期
      };

      expiredToken = jwtService.sign(expiredPayload, {
        secret: configService.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
      });
    });

    it('should authenticate valid WebSocket connection with Bearer token', async () => {
      const connectionParams = {
        authorization: `Bearer ${validToken}`,
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeDefined();
      expect(result?.userId).toBe('test-user-id');
      expect(result?.username).toBe('testuser');
      expect(result?.email).toBe('test@example.com');
    });

    it('should reject connection without authorization', async () => {
      const connectionParams = {};

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeNull();
    });

    it('should reject connection with invalid Bearer format', async () => {
      const connectionParams = {
        authorization: 'InvalidFormat token',
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeNull();
    });

    it('should reject connection with malformed JWT token', async () => {
      const connectionParams = {
        authorization: 'Bearer invalid.jwt.token',
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeNull();
    });

    it('should reject connection with expired JWT token', async () => {
      const connectionParams = {
        authorization: `Bearer ${expiredToken}`,
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeNull();
    });

    it('should handle connectionParams with additional properties', async () => {
      const connectionParams = {
        authorization: `Bearer ${validToken}`,
        clientName: 'Test Client',
        version: '1.0.0',
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeDefined();
      expect(result?.userId).toBe('test-user-id');
    });

    it('should reject connection with non-string authorization', async () => {
      const connectionParams = {
        authorization: 12345,
      };

      const result = await wsAuthService.authenticateConnection(connectionParams);

      expect(result).toBeNull();
    });
  });
});