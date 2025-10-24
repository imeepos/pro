import { ModuleMetadata, Type } from '@nestjs/common';

/**
 * Workflow 模块配置选项
 */
export interface WorkflowModuleOptions {
  /**
   * 是否为全局模块
   * @default false
   */
  isGlobal?: boolean;

  /**
   * 自定义访问者类数组
   * 这些访问者将被自动注册到工作流系统中
   */
  customVisitors?: Type<any>[];
}

/**
 * 异步配置选项
 */
export interface WorkflowModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * 是否为全局模块
   * @default false
   */
  isGlobal?: boolean;

  /**
   * 使用已存在的 provider
   */
  useExisting?: Type<WorkflowOptionsFactory>;

  /**
   * 使用类创建配置
   */
  useClass?: Type<WorkflowOptionsFactory>;

  /**
   * 使用工厂函数创建配置
   */
  useFactory?: (...args: any[]) => Promise<WorkflowModuleOptions> | WorkflowModuleOptions;

  /**
   * 工厂函数依赖注入
   */
  inject?: any[];
}

/**
 * 配置工厂接口
 */
export interface WorkflowOptionsFactory {
  createWorkflowOptions(): Promise<WorkflowModuleOptions> | WorkflowModuleOptions;
}
