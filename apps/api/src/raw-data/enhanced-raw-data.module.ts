import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { RawDataSourceService, MongodbModule, RawDataSource } from '@pro/mongodb';
import { RawDataService } from './raw-data.service';
import { RawDataResolver } from './raw-data.resolver';
import { EnhancedRawDataService } from './enhanced-raw-data.service';
import { EnhancedRawDataResolver } from './enhanced-raw-data.resolver';
import { AuthModule } from '../auth/auth.module';

/**
 * 增强的原始数据模块
 * 集成了原有功能和新增的高级数据管理功能
 *
 * 功能特性：
 * - 原有的基础数据查询和统计
 * - 增强的数据质量分析和监控
 * - 灵活的数据导出和批量操作
 * - 实时数据推送和系统监控
 * - 高性能查询优化和缓存
 *
 * 模块设计原则：
 * - 向后兼容：保持原有API不变
 * - 渐进增强：新功能通过新的Resolver提供服务
 * - 性能优先：优化查询性能和资源使用
 * - 可维护性：清晰的模块边界和依赖关系
 */
@Module({
  imports: [
    // 配置模块支持环境变量
    ConfigModule,

    // 调度模块支持定时任务
    ScheduleModule.forRoot(),

    // 集成 MongoDB 特性模块
    // TODO: Temporarily disabled due to Mongoose dependency injection issues
    // MongodbModule.forFeature(),

    // 显式注册 RawDataSource 模型
    // TODO: Temporarily disabled due to Mongoose dependency injection issues
    // MongooseModule.forFeature([
    //   { name: RawDataSource.name, schema: RawDataSource }
    // ]),

    // 认证模块（前向引用避免循环依赖）
    forwardRef(() => AuthModule),
  ],
  providers: [
    // 原有的核心服务
    RawDataService,

    // 原有的GraphQL解析器
    RawDataResolver,

    // 增强功能服务
    EnhancedRawDataService,

    // 增强功能GraphQL解析器
    EnhancedRawDataResolver,

    // MongoDB 数据源服务（由 MongodbModule.forFeature() 提供）
    // RawDataSourceService 不需要在这里重复注册
  ],
  exports: [
    // 导出原有服务
    RawDataService,

    // 导出增强功能服务
    EnhancedRawDataService,
    EnhancedRawDataResolver,
  ],
})
export class EnhancedRawDataModule {}
