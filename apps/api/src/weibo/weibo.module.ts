import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';
import { WeiboController } from './weibo.controller';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService } from './weibo-auth.service';
import { WeiboHealthCheckService } from './weibo-health-check.service';
import { WeiboHealthCheckScheduler } from './weibo-health-check.scheduler';

/**
 * 微博模块
 * 负责微博登录、账号管理、健康检查等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WeiboAccountEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [WeiboController],
  providers: [
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
    WeiboHealthCheckScheduler,
  ],
  exports: [
    TypeOrmModule,
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
  ],
})
export class WeiboModule {}
