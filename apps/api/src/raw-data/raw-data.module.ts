import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RawDataSource, RawDataSourceService } from '@pro/mongodb';
import { RawDataService } from './raw-data.service';
import { RawDataResolver } from './raw-data.resolver';

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
      { name: RawDataSource.name, schema: RawDataSource }
    ]),
  ],
  providers: [
    RawDataSourceService,
    RawDataService,
    RawDataResolver,
  ],
  exports: [
    RawDataService,
  ],
})
export class RawDataModule {}
