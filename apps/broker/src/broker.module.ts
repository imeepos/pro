import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';
import { DiagnosticService } from './weibo/diagnostic.service';
import { RabbitMQConfigService } from './rabbitmq/rabbitmq-config.service';
import { AggregateSchedulerService } from './services/aggregate-scheduler.service';
import { WeiboSearchTaskEntity } from '@pro/entities';
import { createDatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';

/**
 * Broker 主模块
 * 任务调度中心，负责扫描主任务并生成子任务
 */
@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 日志模块
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/broker',
      logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })),

    // 数据库配置
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService) as TypeOrmModuleOptions,
    }),

    // 任务调度模块
    ScheduleModule.forRoot(),

    // 实体模块
    TypeOrmModule.forFeature([WeiboSearchTaskEntity]),
  ],
  controllers: [AppController],
  providers: [
    // RabbitMQ 配置服务
    RabbitMQConfigService,

    // 任务调度服务
    TaskScannerScheduler,

    // 聚合调度服务
    AggregateSchedulerService,

    // 任务监控服务
    TaskMonitor,

    // 诊断服务
    DiagnosticService,
  ],
  exports: [
    RabbitMQConfigService,
    TaskScannerScheduler,
    AggregateSchedulerService,
    TaskMonitor,
  ],
})
export class BrokerModule {}