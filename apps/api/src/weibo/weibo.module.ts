import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';

/**
 * 微博模块
 * 负责微博登录、账号管理等功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([WeiboAccountEntity])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class WeiboModule {}
