/**
 * Jest集成测试配置
 * 为微博爬虫系统API集成测试提供专门的Jest配置
 */

const { TEST_CONFIG } = { TIMEOUTS: { default: 30000 } }; // 简化配置，避免循环依赖

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/integration/**/*.integration.spec.ts',
  ],

  // 测试文件忽略模式
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'js', 'json'],

  // 转换配置
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // 模块路径映射
  moduleNameMapper: {
    '^@pro/(.*)$': '<rootDir>/../../../packages/$1/src',
    '^@app/(.*)$': '<rootDir>/../src/$1',
  },

  // 测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/../setup.ts',
  ],

  // 覆盖率配置
  collectCoverage: false, // 集成测试通常不收集覆盖率
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.dto.ts',
    '!../src/**/*.spec.ts',
    '!../src/**/*.interface.ts',
  ],

  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],

  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/../coverage/integration',

  // 测试超时配置
  testTimeout: TEST_CONFIG.TIMEOUTS.default,

  // 并发执行配置
  maxWorkers: 1, // 集成测试通常串行执行以避免资源冲突

  // 详细输出配置
  verbose: true,

  // 错误时停止
  bail: false, // 集成测试通常运行所有测试以获得完整反馈

  // 强制退出
  forceExit: true,

  // 检测打开的句柄
  detectOpenHandles: true,

  // 检测泄漏
  detectLeaks: false,

  // 缓存配置
  cache: false, // 集成测试不使用缓存以确保一致性

  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../../../tsconfig.json',
    },
  },

  // 测试环境选项
  testEnvironmentOptions: {
    // Node.js环境特定配置
  },

  // 报告器配置
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/../reports/integration',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: '微博爬虫系统API集成测试报告',
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/../reports',
        outputName: 'integration-test-results.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // 测试结果处理器
  testResultsProcessor: undefined,

  // 快照序列化器
  snapshotSerializers: [],

  // 监视模式忽略模式
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],

  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],

  // 模拟配置
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // 错误阈值
  errorOnDeprecated: true,

  // 随机化测试顺序
  randomize: false, // 集成测试通常保持固定顺序以确保可重现性
};