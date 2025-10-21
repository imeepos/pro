import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { RawDataSource, RawDataSourceSchema } from './schemas/raw-data-source.schema.js';
import { RawDataSourceService } from './services/raw-data-source.service.js';

/**
 * MongoDB 模块配置选项
 */
export interface MongodbModuleOptions extends Partial<MongooseModuleOptions> {
  uri?: string;
}

/**
 * MongoDB 模块
 */
@Module({})
export class MongodbModule {
  /**
   * 根模块配置 - 零配置启动，自动读取环境变量
   */
  static forRoot(options?: MongodbModuleOptions): DynamicModule {
    return {
      module: MongodbModule,
      imports: [
        ConfigModule,
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const uri = options?.uri ||
                        configService.get<string>('MONGODB_URL', 'mongodb://localhost:27017/pro');

            const logger = new Logger('MongodbModule');

            return {
              uri,
              maxPoolSize: options?.maxPoolSize ?? 10,
              serverSelectionTimeoutMS: options?.serverSelectionTimeoutMS ?? 5000,
              socketTimeoutMS: options?.socketTimeoutMS ?? 45000,
              bufferCommands: options?.bufferCommands ?? false,
              connectionFactory: (connection) => {
                connection.on('connected', () => logger.log('MongoDB 连接成功'));
                connection.on('error', (error: Error) => logger.error('MongoDB 连接错误', error));
                connection.on('disconnected', () => logger.warn('MongoDB 连接断开'));
                return connection;
              },
              ...options,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: RawDataSource.name, schema: RawDataSourceSchema },
        ]),
      ],
      providers: [RawDataSourceService],
      exports: [RawDataSourceService],
      global: true,
    };
  }

  /**
   * 异步根模块配置
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<string | { uri: string }> | string | { uri: string };
    inject?: any[];
  }): DynamicModule {
    return {
      module: MongodbModule,
      imports: [
        MongooseModule.forRootAsync({
          ...options,
          useFactory: async (...args: any[]) => {
            const result = await options.useFactory(...args);
            return typeof result === 'string' ? { uri: result } : result;
          },
        }),
        MongooseModule.forFeature([
          { name: RawDataSource.name, schema: RawDataSourceSchema },
        ]),
      ],
      providers: [RawDataSourceService],
      exports: [RawDataSourceService],
      global: true,
    };
  }

  /**
   * 特性模块配置（用于子模块）
   */
  static forFeature(): DynamicModule {
    return {
      module: MongodbModule,
      imports: [
        MongooseModule.forFeature([
          { name: RawDataSource.name, schema: RawDataSourceSchema },
        ]),
      ],
      providers: [RawDataSourceService],
      exports: [RawDataSourceService],
    };
  }
}
