import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { HourlyStatsEntity, DailyStatsEntity } from '@pro/entities';
import { createDatabaseConfig } from '@pro/entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { CacheService } from './services/cache.service';
import { HourlyAggregatorService } from './services/hourly-aggregator.service';
import { DailyAggregatorService } from './services/daily-aggregator.service';
import { WindowAggregatorService } from './services/window-aggregator.service';
import { AnalysisResultConsumer } from './consumers/analysis-result.consumer';
import { MessageIdempotencyService } from './services/message-idempotency.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/aggregator',
        logLevel:
          process.env.LOG_LEVEL ||
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      }),
    ),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createDatabaseConfig(configService) as TypeOrmModuleOptions,
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forFeature([HourlyStatsEntity, DailyStatsEntity]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RabbitMQService,
    CacheService,
    MessageIdempotencyService,
    HourlyAggregatorService,
    DailyAggregatorService,
    WindowAggregatorService,
    AnalysisResultConsumer,
  ],
})
export class AppModule {}
