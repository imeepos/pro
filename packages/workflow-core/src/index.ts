/**
 * @pro/workflow-core - DAG工作流执行引擎核心包
 *
 * 一个框架无关的优雅工作流引擎
 * 支持DAG结构、并行执行、状态管理
 * 基于访问者模式的可扩展架构
 */

// 核心类型定义
export * from './types';

// 抽象语法树定义
export * from './ast';

// 工作流构建器
export * from './builder';

// 工作流执行器
export * from './executor';

// 工具函数集合
export * from './utils';

// 错误处理系统
export * from './errors';

// 重新导出所有功能

// 版本信息
export const VERSION = '1.0.0';

// 默认配置
export const DEFAULT_CONFIG = {
    maxConcurrency: 10,
    timeout: 300000,
    retryAttempts: 3
} as const;