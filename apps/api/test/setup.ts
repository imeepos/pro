import '@jest/globals';

// 全局测试设置
beforeAll(async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.API_KEY_TEST = 'ak_21e04cb9c23b1256dc2debf99c211c4b';

  // 设置测试数据库配置
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'pro_test';

  // 设置Redis配置
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
});

afterAll(async () => {
  // 清理测试环境
  delete process.env.NODE_ENV;
  delete process.env.API_KEY_TEST;
});

// 每个测试前的清理
beforeEach(async () => {
  // 清理可能的状态
  jest.clearAllMocks();
});

afterEach(async () => {
  // 等待所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 100));
});