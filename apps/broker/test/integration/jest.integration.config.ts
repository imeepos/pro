/**
 * 集成测试Jest配置
 * 专门针对broker服务的集成测试环境配置
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'Broker Integration Tests',

  // 设置根目录为broker应用根目录
  rootDir: '../..',

  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/integration/**/*.integration.spec.ts',
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'js', 'json'],

  // 转换配置
  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.build.json',
    }],
  },

  // 模块路径映射
  moduleNameMapper: {
    '^@pro/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@pro/(.*)/(.*)$': '<rootDir>/../../packages/$1/src/$2',
  },

  // 测试设置文件
  // setupFilesAfterEnv: ['<rootDir>/test/integration/jest.final.setup.ts'], // 禁用以避免缓存问题

  // 覆盖率配置
  collectCoverage: false, // 集成测试不生成覆盖率

  // 测试超时设置
  testTimeout: 60000, // 60秒超时

  // 缓存设置
  cache: false, // 禁用缓存以避免缓存问题

  // 并发设置
  maxWorkers: 4, // 最大4个并发进程

  // 详细输出
  verbose: true,

  // 清理模拟
  clearMocks: true,
  restoreMocks: true,

  // 环境变量
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // 忽略的路径
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],

  // 模块路径忽略
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
  ],

  // 覆盖率收集路径（如果需要）
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/**/*.d.ts',
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // 报告器配置
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'integration-test-results.xml',
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
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Broker Integration Test Report',
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
  ],
};

export default config;