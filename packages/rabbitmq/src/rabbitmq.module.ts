import { DynamicModule, Module, Provider } from '@nestjs/common';
import type { ModuleMetadata } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import type { RabbitMQConfig } from './types.js';

/**
 * 异步配置选项
 *
 * 存在即合理：支持从 ConfigService 等异步源获取配置
 */
export interface RabbitMQAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig;
  inject?: any[];
}

/**
 * RabbitMQ 模块常量
 */
const RABBITMQ_CONFIG = Symbol('RABBITMQ_CONFIG');

/**
 * RabbitMQ 模块
 *
 * 优雅即简约：
 * - forRoot: 同步配置，直接传入配置对象
 * - forRootAsync: 异步配置，支持依赖注入
 *
 * 使用示例：
 *
 * 同步配置：
 * ```ts
 * RabbitMQModule.forRoot({
 *   url: 'amqp://localhost:5672',
 *   poolSize: 5
 * })
 * ```
 *
 * 异步配置：
 * ```ts
 * RabbitMQModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     url: config.get('RABBITMQ_URL'),
 *     poolSize: config.get('RABBITMQ_POOL_SIZE')
 *   }),
 *   inject: [ConfigService]
 * })
 * ```
 */
@Module({})
export class RabbitMQModule {
  static forRoot(config: RabbitMQConfig): DynamicModule {
    return {
      module: RabbitMQModule,
      global: true,
      providers: [
        {
          provide: RABBITMQ_CONFIG,
          useValue: config,
        },
        {
          provide: RabbitMQService,
          useFactory: (cfg: RabbitMQConfig) => {
            const service = new RabbitMQService(cfg);
            return service;
          },
          inject: [RABBITMQ_CONFIG],
        },
      ],
      exports: [RabbitMQService],
    };
  }

  static forRootAsync(options: RabbitMQAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: RABBITMQ_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: RabbitMQModule,
      global: true,
      imports: options.imports || [],
      providers: [
        configProvider,
        {
          provide: RabbitMQService,
          useFactory: (cfg: RabbitMQConfig) => {
            const service = new RabbitMQService(cfg);
            return service;
          },
          inject: [RABBITMQ_CONFIG],
        },
      ],
      exports: [RabbitMQService],
    };
  }
}
