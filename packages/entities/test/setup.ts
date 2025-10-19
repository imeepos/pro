import 'reflect-metadata';

// 测试环境全局配置
process.env.NODE_ENV = 'test';

// 设置测试数据库连接字符串
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_USER = 'test';
process.env.POSTGRES_PASSWORD = 'test';
process.env.POSTGRES_DB = 'test_pro_entities';

process.env.MONGODB_URI = 'mongodb://localhost:27017/test_pro_entities';

process.env.REDIS_URL = 'redis://localhost:6379/1';

// 全局超时设置
jest.setTimeout(30000);

// 控制台输出过滤
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};