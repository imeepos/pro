import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { WeiboSearchTaskEntity, createDatabaseConfig } from '@pro/entities';

// 核心服务导入 - 每个导入都有其存在的意义
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';
import { DiagnosticService } from './weibo/diagnostic.service';
import { RabbitMQConfigService } from './rabbitmq/rabbitmq-config.service';
import { AggregateSchedulerService } from './services/aggregate-scheduler.service';

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
    TypeOrmModule.forFeature([WeiboSearchTaskEntity]),
  ],

  // 服务之群 - 业务逻辑的守护者
  providers: [
    RabbitMQConfigService,        // 消息桥梁的构建者
    TaskScannerScheduler,         // 任务的唤醒者
    AggregateSchedulerService,    // 数据聚合的指挥家
    TaskMonitor,                  // 系统健康的守望者
    DiagnosticService,            // 异常诊断的医师
  ],

  // 导出之选 - 模块间的礼物
  exports: [
    RabbitMQConfigService,
    TaskScannerScheduler,
    AggregateSchedulerService,
    TaskMonitor,
  ],
})
export class BrokerModule {}
