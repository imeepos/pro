import { DynamicModule, Module, Provider } from '@nestjs/common';
import { WORKFLOW_MODULE_OPTIONS } from './constants';
import {
  WorkflowModuleOptions,
  WorkflowModuleAsyncOptions,
  WorkflowOptionsFactory,
} from './interfaces/workflow-module-options.interface';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { WorkflowBuilderService } from './services/workflow-builder.service';

/**
 * Workflow 模块 - DAG 工作流执行引擎
 *
 * 设计哲学：
 * - 开箱即用：零配置即可工作
 * - 优雅简约：最小化的 API 表面积
 * - 类型安全：充分利用 TypeScript 类型系统
 *
 * @example
 * // 基础用法
 * @Module({
 *   imports: [WorkflowModule.forRoot()],
 * })
 * class AppModule {}
 *
 * @example
 * // 带配置的用法
 * @Module({
 *   imports: [
 *     WorkflowModule.forRoot({
 *       isGlobal: true,
 *       customVisitors: [MyCustomVisitor],
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
@Module({})
export class WorkflowModule {
  /**
   * 同步配置模块
   */
  static forRoot(options: WorkflowModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: WORKFLOW_MODULE_OPTIONS,
        useValue: options,
      },
      WorkflowExecutorService,
      WorkflowBuilderService,
    ];

    return {
      module: WorkflowModule,
      global: options.isGlobal ?? false,
      providers,
      exports: [WorkflowExecutorService, WorkflowBuilderService],
    };
  }

  /**
   * 异步配置模块
   */
  static forRootAsync(options: WorkflowModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      WorkflowExecutorService,
      WorkflowBuilderService,
    ];

    return {
      module: WorkflowModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers,
      exports: [WorkflowExecutorService, WorkflowBuilderService],
    };
  }

  /**
   * 创建异步配置 provider
   */
  private static createAsyncProviders(options: WorkflowModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  /**
   * 创建异步配置选项 provider
   */
  private static createAsyncOptionsProvider(options: WorkflowModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: WORKFLOW_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useExisting) {
      return {
        provide: WORKFLOW_MODULE_OPTIONS,
        useFactory: async (optionsFactory: WorkflowOptionsFactory) =>
          await optionsFactory.createWorkflowOptions(),
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: WORKFLOW_MODULE_OPTIONS,
        useFactory: async (optionsFactory: WorkflowOptionsFactory) =>
          await optionsFactory.createWorkflowOptions(),
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid WorkflowModuleAsyncOptions');
  }
}
