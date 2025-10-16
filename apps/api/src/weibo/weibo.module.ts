import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboSearchTaskEntity } from '@pro/entities';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService } from './weibo-auth.service';
import { WeiboHealthCheckService } from './weibo-health-check.service';
import { WeiboHealthCheckScheduler } from './weibo-health-check.scheduler';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import { WeiboAccountResolver } from './weibo-account.resolver';
import { WeiboSearchTaskResolver } from './weibo-search-task.resolver';
import { ScreensModule } from '../screens/screens.module';
import { AuthModule } from '../auth/auth.module';
import { WeiboAuthResolver } from './weibo-auth.resolver';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboTaskStatusConsumer } from './weibo-task-status.consumer';
import { WeiboTaskStatusResolver } from './weibo-task-status.resolver';

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
    // ScheduleModule.forRoot(), // 已移至全局模块
    forwardRef(() => ScreensModule),
    AuthModule,
  ],
  controllers: [],
  providers: [
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
    WeiboHealthCheckScheduler,
    WeiboSearchTaskService,
    WeiboAccountResolver,
    WeiboSearchTaskResolver,
    WeiboAuthResolver,
    WeiboRabbitMQConfigService,
    WeiboTaskStatusConsumer,
    WeiboTaskStatusResolver,
  ],
  exports: [
    TypeOrmModule,
    WeiboAccountService,
    WeiboAuthService,
    WeiboHealthCheckService,
    WeiboSearchTaskService,
    WeiboRabbitMQConfigService,
  ],
})
export class WeiboModule {}
