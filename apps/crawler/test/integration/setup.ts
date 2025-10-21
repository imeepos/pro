import { beforeAll, afterAll } from '@jest/globals';

// 兼容老版本 signal-exit 导出的 onExit 接口
// 在某些测试环境中，require('signal-exit') 返回函数本身而非对象
// 这里显式补齐 onExit，用于 write-file-atomic 缓存清理逻辑
// eslint-disable-next-line @typescript-eslint/no-var-requires
const signalExitModule = require('signal-exit');
const signalExit =
  typeof signalExitModule === 'function' && typeof signalExitModule.onExit !== 'function'
    ? Object.assign(signalExitModule, { onExit: signalExitModule })
    : signalExitModule;
if (typeof signalExit.onExit !== 'function') {
  signalExit.onExit = () => {};
}

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
process.on('unhandledRejection', (reason, _promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});
