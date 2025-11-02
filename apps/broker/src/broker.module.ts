import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, createLoggerConfig } from '@pro/logger-nestjs';

// 核心服务导入 - 每个导入都有其存在的意义
import { SimpleIntervalScheduler } from './weibo/simple-interval-scheduler.service';
import { SimpleTaskMonitor } from './weibo/simple-task-monitor.service';
import { DiagnosticService } from './weibo/diagnostic.service';
import { RabbitMQConfigService } from './rabbitmq/rabbitmq-config.service';
import { AggregateSchedulerService } from './services/aggregate-scheduler.service';
import { WeiboAccountHealthScheduler } from './weibo/account-health-scheduler.service';
import { DlqConsumer } from './consumers/dlq.consumer';
import { AccountInitService } from './services/account-init.service';

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


    // 时间之舞 - 定时任务的舞台
    ScheduleModule.forRoot(),
  ],

  // 服务之群 - 业务逻辑的守护者
  providers: [
    RabbitMQConfigService,        // 消息桥梁的构建者
    AccountInitService,           // 账号初始化的启动者
    SimpleIntervalScheduler,      // 简化的任务调度器
    AggregateSchedulerService,    // 数据聚合的指挥家
    SimpleTaskMonitor,            // 简化的健康守望者
    DiagnosticService,            // 异常诊断的医师
    DlqConsumer,                  // 死信队列的守望者
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
