/**
 * @pro/workflow - DAG 工作流执行引擎
 *
 * 基于状态机和访问者模式的工作流引擎，支持：
 * - DAG（有向无环图）工作流定义
 * - 并行执行能力
 * - 可扩展的访问者模式
 * - NestJS 依赖注入集成
 */

// 核心模块
export * from './workflow.module';

// 服务
export * from './services/workflow-executor.service';
export * from './services/workflow-builder.service';

// 核心类型和接口
export * from './types';
export * from './ast';
export * from './builder';
export * from './executor';
export * from './decorator';
export * from './decorators/workflow-node.decorator';
export * from './decorators/workflow-visitor.decorator';
export * from './decorators/visit-method.decorator';
export * from './utils';
export * from './errors';
export * from './generater';
export * from './PlaywrightExecutor';

// 配置接口
export * from './interfaces/workflow-module-options.interface';

// 常量
export * from './constants';
