import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RawDataSource, RawDataSourceSchema } from './schemas/raw-data-source.schema.js';
import { RawDataSourceService } from './services/raw-data-source.service.js';

/**
 * MongoDB 模块配置选项
 */
export interface MongodbModuleOptions {
  uri: string;
}

/**
 * MongoDB 模块
 */
@Module({})
export class MongodbModule {
  /**
   * 根模块配置
   */
  static forRoot(uri: string): DynamicModule {
    return {
      module: MongodbModule,
      imports: [
        MongooseModule.forRoot(uri),
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
