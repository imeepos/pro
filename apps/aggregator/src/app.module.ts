import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule, createLoggerConfig } from '@pro/logger-nestjs';
import { ConfigurationModule } from '@pro/configuration';
import { ErrorHandlingModule } from '@pro/error-handling';
import { HourlyStatsEntity, DailyStatsEntity } from '@pro/entities';
import { createDatabaseConfig } from '@pro/entities';
import { AppController } from './app.controller';
import { TransactionHealthController } from './controllers/transaction-health.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { AppService } from './app.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { CacheService } from './services/cache.service';
import { TransactionService } from './services/transaction.service';
import { CacheConsistencyService } from './services/cache-consistency.service';
import { TransactionMetricsService } from './services/transaction-metrics.service';
import { HourlyAggregatorService } from './services/hourly-aggregator.service';
import { DailyAggregatorService } from './services/daily-aggregator.service';
import { WindowAggregatorService } from './services/window-aggregator.service';
import { AnalysisResultConsumer } from './consumers/analysis-result.consumer';
import { MessageIdempotencyService } from './services/message-idempotency.service';
import { TransactionInterceptor } from './interceptors/transaction.interceptor';
// 监控系统导入
import { MetricsService } from './services/metrics.service';
import { PrometheusAdapterService } from './services/prometheus-adapter.service';
import { HealthCheckService } from './services/health-check.service';
import { AlertManagerService } from './services/alert-manager.service';
import { MonitoringInitializerService } from './services/monitoring-initializer.service';
import { RedisClient } from '@pro/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ConfigurationModule,
    ErrorHandlingModule,

    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/aggregator',
        logLevel:
          process.env.LOG_LEVEL ||
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      }),
    ),

    // 事件发射器模块 - 用于告警系统
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: () => createDatabaseConfig() as TypeOrmModuleOptions,
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forFeature([HourlyStatsEntity, DailyStatsEntity]),
  ],
  controllers: [
    AppController,
    TransactionHealthController,
    MonitoringController,
  ],
  providers: [
    AppService,
    RabbitMQService,
    CacheService,
    TransactionService,
    CacheConsistencyService,
    TransactionMetricsService,
    TransactionInterceptor,
    MessageIdempotencyService,
    HourlyAggregatorService,
    DailyAggregatorService,
    WindowAggregatorService,
    AnalysisResultConsumer,
    // 监控系统服务
    MetricsService,
    PrometheusAdapterService,
    HealthCheckService,
    AlertManagerService,
    MonitoringInitializerService,
    RedisClient,
  ],
})
export class AppModule {}
