import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';
import { RabbitMQConfigService } from './rabbitmq/rabbitmq-config.service';
import { WeiboSearchTaskEntity } from './entities/weibo-search-task.entity';
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

    // 数据库配置
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
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

    // 任务监控服务
    TaskMonitor,
  ],
  exports: [
    RabbitMQConfigService,
    TaskScannerScheduler,
    TaskMonitor,
  ],
})
export class BrokerModule {}