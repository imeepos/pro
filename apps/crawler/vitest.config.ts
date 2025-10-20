/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest配置 - 现代化的测试解决方案
 * 替代Jest，提供更好的TypeScript支持和性能
 */
export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',

    // 测试文件匹配模式
    include: [
      'src/**/*.spec.ts',
      'src/**/*.test.ts',
      'test/integration/**/*.integration.test.ts',
      'test/**/*.spec.ts',
    ],

    // 排除文件
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test/e2e/**',
    ],

    // 全局设置
    globals: true,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        'test/**',
      ],
    },

    // 超时设置 - 适应爬虫特性
    testTimeout: 300000, // 5分钟
    hookTimeout: 300000,

    // 并发控制
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },

    // 监视文件
    watch: false,

    // 报告器
    reporters: ['verbose', 'json', 'html'],

    // 输出目录
    outputFile: {
      json: './test-results/vitest-results.json',
      html: './test-results/vitest-report.html',
    },

    // 环境变量
    env: {
      NODE_ENV: 'test',
      CRAWLER_TEST_MODE: 'integration',
      PLAYWRIGHT_BROWSERS_PATH: '0',
    },

    // 测试设置文件
    setupFiles: [],
  },

  // 解析配置
  resolve: {
    alias: {
      '@pro/entities': resolve('../../packages/entities/src'),
      '@pro/types': resolve('../../packages/types/src'),
      '@pro/utils': resolve('../../packages/utils/src'),
      '@pro/logger': resolve('../../packages/logger/src'),
      '@pro/mongodb': resolve('../../packages/mongodb/src'),
      '@pro/redis': resolve('../../packages/redis/src'),
      '@pro/rabbitmq': resolve('../../packages/rabbitmq/src'),
      '@pro/minio': resolve('../../packages/minio/src'),
      '@pro/sdk': resolve('../../packages/sdk/src'),
      '@pro/components': resolve('../../packages/components/src'),
    },
  },

  // TypeScript配置
  esbuild: {
    target: 'node18',
    format: 'esm',
  },
});