import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { RawDataSourceService, MongodbModule, RawDataSource, RawDataSourceSchema } from '@pro/mongodb';
import { RawDataService } from './raw-data.service';
import { RawDataResolver } from './raw-data.resolver';
import { RawDataGateway } from './raw-data.gateway';

/**
 * 原始数据模块
 * 负责原始数据的查询、统计、分析等功能
 *
 * 此模块提供了对 MongoDB 中原始数据的完整访问能力，
 * 包括数据查询、统计分析、趋势分析等核心功能。
 *
 * 模块设计原则：
 * - 单一职责：专注于原始数据的查询和分析
 * - 高内聚：相关功能集中在模块内部
 * - 低耦合：通过依赖注入与外部模块解耦
 * - 可测试：所有服务都易于单元测试
 */
@Module({
  imports: [
    // 集成 MongoDB 特性模块，提供数据源服务和模型注册
    // TODO: Temporarily disabled due to Mongoose dependency injection issues
    // MongodbModule.forFeature(),

    // 显式注册 RawDataSource 模型
    // TODO: Temporarily disabled due to Mongoose dependency injection issues
    // MongooseModule.forFeature([
    //   { name: RawDataSource.name, schema: RawDataSourceSchema }
    // ]),

    // JWT模块用于WebSocket认证
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    // 原始数据服务层 - 核心业务逻辑
    RawDataService,

    // GraphQL 解析器 - 提供查询接口
    RawDataResolver,

    // WebSocket Gateway - 实时数据推送
    RawDataGateway,

    // MongoDB 数据源服务 - 底层数据访问（由 MongodbModule.forFeature() 提供）
    // RawDataSourceService 不需要在这里重复注册
  ],
  exports: [
    // 导出服务供其他模块使用
    RawDataService,
    RawDataGateway,
  ],
})
export class RawDataModule {}