import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { WeiboAccountEntity, WeiboSearchTaskEntity, WeiboSubTaskEntity, createDatabaseConfig } from '@pro/entities';
import { RedisClient, redisConfigFactory } from '@pro/redis';

// 核心服务导入 - 每个导入都有其存在的意义
import { SimpleIntervalScheduler } from './weibo/simple-interval-scheduler.service';
import { SimpleTaskMonitor } from './weibo/simple-task-monitor.service';
import { DiagnosticService } from './weibo/diagnostic.service';
import { RabbitMQConfigService } from './rabbitmq/rabbitmq-config.service';
import { AggregateSchedulerService } from './services/aggregate-scheduler.service';
import { WeiboAccountHealthScheduler } from './weibo/account-health-scheduler.service';

/**
 * Broker 模块 - 任务调度的心脏
 *
 * 设计哲学：
 * - 每个模块导入都有其不可替代的价值
 * - 依赖关系清晰可见，如同血脉相连
 * - 配置与业务逻辑分离，各司其职
 *
 * 核心使命：
 * - 成为任务调度的指挥中心
 * - 协调各个服务优雅地协同工作
 * - 确保系统的稳定与可靠
 */
@Module({
  imports: [
    // 配置之基 - 全局配置的源泉
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 日志之魂 - 系统的声音与记忆
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/broker',
      logLevel: process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })),

    // 数据之根 - 持久化的基石
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
    }),

    // 时间之舞 - 定时任务的舞台
    ScheduleModule.forRoot(),

    // 实体之殿 - 数据模型的家园
    TypeOrmModule.forFeature([WeiboAccountEntity, WeiboSearchTaskEntity, WeiboSubTaskEntity]),
  ],

  // 服务之群 - 业务逻辑的守护者
  providers: [
    RabbitMQConfigService,        // 消息桥梁的构建者
    SimpleIntervalScheduler,      // 简化的任务调度器
    AggregateSchedulerService,    // 数据聚合的指挥家
    SimpleTaskMonitor,            // 简化的健康守望者
    DiagnosticService,            // 异常诊断的医师
    {
      provide: RedisClient,
      useFactory: (configService: ConfigService) => {
        return new RedisClient(redisConfigFactory(configService));
      },
      inject: [ConfigService],
    },
    WeiboAccountHealthScheduler,  // 微博账号健康度的守护者
  ],

  // 导出之选 - 模块间的礼物
  exports: [
    RabbitMQConfigService,
    SimpleIntervalScheduler,
    AggregateSchedulerService,
    SimpleTaskMonitor,
  ],
})
export class BrokerModule {}
