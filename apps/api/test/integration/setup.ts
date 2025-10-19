/**
 * 集成测试设置文件
 *
 * 这个文件在所有集成测试运行前执行，设置测试环境和全局配置
 */

import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.test' });

// 设置全局测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'warn';

// 设置测试数据库
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_integration';

// 设置测试Redis
process.env.REDIS_URL = 'redis://localhost:6379/1';

// 设置测试JWT密钥
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-testing';

// 设置测试内部API令牌
process.env.INTERNAL_API_TOKEN = 'test-internal-token';

// 设置测试存储配置
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'testkey';
process.env.MINIO_SECRET_KEY = 'testsecret';

// 全局测试超时设置
jest.setTimeout(60000); // 60秒默认超时

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 全局测试工具
global.testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateRandomString: (length: number = 10) =>
    Math.random().toString(36).substring(2, length + 2),
  generateTestEmail: () =>
    `test_${Date.now()}_${Math.random().toString(36).substring(2)}@example.com`,
  generateTestUsername: () =>
    `testuser_${Date.now()}_${Math.random().toString(36).substring(2)}`,
};

console.log('集成测试环境设置完成');