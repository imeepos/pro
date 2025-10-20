/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * 简化的Vitest配置 - 专注于基本测试功能
 */
export default defineConfig({
  test: {
    environment: 'node',

    // 只测试简单文件
    include: [
      'src/app.controller.spec.ts',
      'src/app.service.spec.ts',
      'src/monitoring/request-monitor.service.spec.ts',
    ],

    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test/**',
      'src/data-cleaner/**',
    ],

    globals: true,
    watch: false,

    // 超时设置
    testTimeout: 10000,
    hookTimeout: 10000,

    // 环境变量
    env: {
      NODE_ENV: 'test',
    },

    // 报告器
    reporters: ['verbose'],
  },

  esbuild: {
    target: 'node18',
  },
});