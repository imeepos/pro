/**
 * 微博爬虫集成测试Jest配置
 * 数字时代的爬虫测试艺术品
 * 专为微博爬虫系统的集成测试环境精心设计
 */

// 兼容部分依赖对 signal-exit 的旧版调用方式，保证 onExit 始终可用
const signalExitPath = require.resolve('signal-exit');
const loadedSignalExit = require(signalExitPath);

const createOnExitShim = (impl) => {
  const shim = function onExitShim(handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }
    return impl(handler);
  };

  shim.onExit = shim;
  shim.signals = loadedSignalExit?.signals ?? ['exit', 'SIGINT', 'SIGTERM'];
  shim.load = loadedSignalExit?.load ? loadedSignalExit.load.bind(loadedSignalExit) : () => {};
  shim.unload = loadedSignalExit?.unload ? loadedSignalExit.unload.bind(loadedSignalExit) : () => {};
  return shim;
};

let normalizedSignalExit;

if (typeof loadedSignalExit === 'function') {
  normalizedSignalExit = loadedSignalExit;
  if (typeof normalizedSignalExit.onExit !== 'function') {
    normalizedSignalExit.onExit = normalizedSignalExit;
  }
} else if (loadedSignalExit && typeof loadedSignalExit.onExit === 'function') {
  normalizedSignalExit = createOnExitShim(loadedSignalExit.onExit.bind(loadedSignalExit));
} else {
  normalizedSignalExit = createOnExitShim((handler) => {
    const wrapped = (...args) => {
      try {
        handler(...args);
      } finally {
        process.removeListener('exit', wrapped);
      }
    };
    process.on('exit', wrapped);
    return () => process.removeListener('exit', wrapped);
  });
}

require.cache[signalExitPath].exports = normalizedSignalExit;

module.exports = {
  // 测试显示名称
  displayName: 'Weibo Crawler Integration Tests',

  // 测试环境 - 爬虫需要浏览器环境支持
  testEnvironment: 'node',

  // 测试文件匹配模式 - 聚焦集成测试
  testMatch: [
    '<rootDir>/**/*.integration.test.ts',
    '<rootDir>/**/*.test.ts',
  ],

  // 测试文件忽略模式
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/test/e2e/',
    '<rootDir>/coverage/',
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'js', 'json'],

  // TypeScript转换配置
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // 使用主tsconfig文件
      useESM: false, // 禁用ESM模式避免缓存问题
      diagnostics: false,
      isolatedModules: true,
    }],
  },

  // 模块路径映射 - 支持workspace包引用
  moduleNameMapper: {
    '^@pro/(.*)$': '<rootDir>/../../../../packages/$1/dist',
    '^@pro/(.*)/(.*)$': '<rootDir>/../../../../packages/$1/dist/$2',
    '^signal-exit$': '<rootDir>/signal-exit-shim.js',
  },

  // 测试环境设置
  setupFilesAfterEnv: [
    '<rootDir>/setup.ts',
    'jest-extended/all', // 扩展Jest匹配器
  ],

  // 覆盖率配置 - 集成测试默认关闭，可单独启用
  collectCoverage: false,

  // 覆盖率收集路径（按需启用）
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/__tests__/**',
  ],

  // 覆盖率报告配置
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // 爬虫测试超时设置 - 考虑网络延迟和浏览器操作
  testTimeout: 300000, // 5分钟超时，适应爬虫特性

  // 并发控制 - 爬虫资源消耗大，限制并发数
  maxWorkers: 2, // 最多2个并发进程，避免资源竞争
  maxConcurrency: 1, // 串行执行，确保浏览器测试稳定

  // 详细输出 - 便于调试爬虫问题
  verbose: true,

  // 资源清理 - 确保浏览器进程正确退出
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  detectOpenHandles: true,
  detectLeaks: false, // 启用可能导致性能问题，按需开启
  forceExit: true,

  
  // 测试环境变量 - 爬虫测试特定配置
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    CRAWLER_TEST_MODE: 'integration',
    PLAYWRIGHT_BROWSERS_PATH: '0', // 使用系统安装的浏览器
  },

  // 缓存配置 - 禁用缓存避免问题
  cache: false,

  // 模块加载配置
  moduleDirectories: ['node_modules', '<rootDir>/../../../../packages'],

  // 监视模式忽略模式 - 提高watch性能
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/',
  ],

  // 转换忽略模式 - 优化Playwright相关模块的处理
  transformIgnorePatterns: [
    'node_modules/(?!(playwright|@playwright))/',
  ],

  // 错误处理
  errorOnDeprecated: true,
  bail: false, // 集成测试通常运行所有测试以获得完整反馈

  // 随机化测试顺序
  randomize: false, // 集成测试通常保持固定顺序以确保可重现性

  // 测试报告器配置
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'crawler-integration-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'crawler-integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Weibo Crawler Integration Test Report',
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
  ],
};
