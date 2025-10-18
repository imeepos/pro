import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { RawDataSource, RawDataSourceSchema } from '@pro/mongodb';
import { RawDataService } from './raw-data.service';
import { RawDataResolver } from './raw-data.resolver';
import { RawDataGateway } from './raw-data.gateway';

/**
 * 原始数据模块
 * 专注于原始数据的业务逻辑：查询、统计、分析
 *
 * 架构设计哲学：
 * - 完整的模块自包含：包含所需的MongoDB模型
 * - 单一职责：业务逻辑与数据访问分离
 * - 存在即合理：每个组件都有不可替代的作用
 */
@Module({
  imports: [
    // MongoDB模型注册
    MongooseModule.forFeature([
      { name: RawDataSource.name, schema: RawDataSourceSchema }
    ]),
    // JWT模块用于WebSocket认证
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    RawDataService,
    RawDataResolver,
    RawDataGateway,
  ],
  exports: [
    RawDataService,
    RawDataGateway,
  ],
})
export class RawDataModule {}