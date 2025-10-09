import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';
import { WeiboController } from './weibo.controller';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService } from './weibo-auth.service';
import { WeiboHealthCheckService } from './weibo-health-check.service';
import { WeiboHealthCheckScheduler } from './weibo-health-check.scheduler';
import { WeiboSearchTaskController } from './weibo-search-task.controller';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import { ScreensModule } from '../screens/screens.module';

/**
 * 微博模块
 * 负责微博登录、账号管理、健康检查等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WeiboAccountEntity,
      WeiboSearchTaskEntity,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => ScreensModule),
  ],
  controllers: [
    WeiboController,
    WeiboSearchTaskController,
  ],
  providers: [
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
    WeiboHealthCheckScheduler,
    WeiboSearchTaskService,
  ],
  exports: [
    TypeOrmModule,
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
    WeiboSearchTaskService,
  ],
})
export class WeiboModule {}
