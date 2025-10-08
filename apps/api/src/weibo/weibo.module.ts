import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';
import { WeiboController } from './weibo.controller';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService } from './weibo-auth.service';

/**
 * 微博模块
 * 负责微博登录、账号管理等功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([WeiboAccountEntity])],
  controllers: [WeiboController],
  providers: [WeiboAccountService, WeiboAuthService],
  exports: [TypeOrmModule, WeiboAuthService],
})
export class WeiboModule {}
