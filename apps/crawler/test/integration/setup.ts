import { beforeAll, afterAll } from '@jest/globals';

/**
 * 微博爬取集成测试环境设置
 * 数字时代的测试基础设施艺术品
 */

beforeAll(async () => {
  console.log('🚀 开始初始化微博爬取集成测试环境');

  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // 减少测试时的日志输出

  // 设置超时时间
  jest.setTimeout(60000); // 60秒超时

  console.log('✅ 微博爬取集成测试环境初始化完成');
});

afterAll(async () => {
  console.log('🧹 开始清理微博爬取集成测试环境');

  // 清理资源
  // 这里可以添加数据库清理、文件清理等逻辑

  console.log('✅ 微博爬取集成测试环境清理完成');
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});