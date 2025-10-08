import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('应成功注册新用户', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user.username).toBe('testuser');
          accessToken = res.body.data.accessToken;
          refreshToken = res.body.data.refreshToken;
        });
    });

    it('用户名重复应返回错误', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'another@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('密码过短应返回验证错误', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('应成功登录', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'testuser',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
        });
    });

    it('密码错误应返回401', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('应返回当前用户信息', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.username).toBe('testuser');
        });
    });

    it('无token应返回401', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('应成功刷新token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
        });
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('应成功登出', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('登出后token应失效', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
