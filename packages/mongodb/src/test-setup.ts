import { beforeAll, afterAll } from '@jest/globals';

// 全局测试配置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
});

// 清理资源
afterAll(() => {
  // 清理测试资源
});

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});