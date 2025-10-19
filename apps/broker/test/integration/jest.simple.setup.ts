/**
 * Jest集成测试设置文件
 * 配置全局测试环境和工具函数
 */

// 增加测试超时时间
jest.setTimeout(60000);

// 全局测试常量
global.testConstants = {
  DEFAULT_TIMEOUT: 30000,
  SHORT_TIMEOUT: 5000,
  LONG_TIMEOUT: 120000,
  RETRY_DELAY: 1000,
  BATCH_SIZE: 10,
  MAX_RETRIES: 3,
};

// 全局测试工具函数
global.testUtils = {
  /**
   * 创建指定时间范围的日期
   */
  createDateRange(hoursAgo: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - hoursAgo * 60 * 60 * 1000);
    return { start, end };
  },

  /**
   * 生成随机任务ID
   */
  generateTaskId(): number {
    return Math.floor(Math.random() * 1000000) + 1;
  },

  /**
   * 生成随机关键词
   */
  generateKeyword(): string {
    const keywords = ['科技', '新闻', '娱乐', '体育', '财经', '时尚', '美食', '旅游'];
    return keywords[Math.floor(Math.random() * keywords.length)] + Math.floor(Math.random() * 1000);
  },

  /**
   * 等待指定时间
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 重试执行函数
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await this.sleep(delay * Math.pow(2, i)); // 指数退避
        }
      }
    }

    throw lastError;
  },

  /**
   * 验证时间精度（分钟级）
   */
  validateMinutePrecision(date: Date): boolean {
    return date.getSeconds() === 0 && date.getMilliseconds() === 0;
  },

  /**
   * 计算时间差（分钟）
   */
  getMinuteDifference(date1: Date, date2: Date): number {
    return Math.floor(Math.abs(date1.getTime() - date2.getTime()) / (60 * 1000));
  },

  /**
   * 创建测试用的子任务消息
   */
  createSubTaskMessage(overrides: any = {}) {
    const now = new Date();
    now.setSeconds(0, 0); // 分钟精度

    return {
      taskId: this.generateTaskId(),
      keyword: this.generateKeyword(),
      start: new Date(now.getTime() - 60 * 60 * 1000),
      end: now,
      isInitialCrawl: true,
      weiboAccountId: 1,
      enableAccountRotation: false,
      ...overrides,
    };
  },

  /**
   * 创建测试用的任务结果消息
   */
  createTaskResultMessage(overrides: any = {}) {
    return {
      taskId: this.generateTaskId(),
      status: 'success',
      pageCount: 5,
      shouldTriggerNext: false,
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      completedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * 模拟性能指标
   */
  createPerformanceMetrics(overrides: any = {}) {
    return {
      taskId: this.generateTaskId(),
      executionTime: Math.random() * 10000 + 1000,
      memoryUsage: Math.random() * 1024 + 100,
      cpuUsage: Math.random() * 100,
      networkLatency: Math.random() * 200 + 10,
      queueTime: Math.random() * 5000 + 100,
      errorCount: 0,
      successRate: 100,
      timestamp: new Date(),
      ...overrides,
    };
  },
};

// 设置控制台输出格式
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};

// 设置未处理的Promise rejection处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 设置未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 测试环境清理
afterEach(() => {
  // 清理所有模拟
  jest.clearAllMocks();

  // 重置模块注册表
  jest.resetModules();
});

// 全局测试清理
afterAll(() => {
  // 关闭数据库连接（如果有的话）
  // 关闭其他资源连接
});