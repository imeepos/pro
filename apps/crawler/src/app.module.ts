import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { MongodbModule } from '@pro/mongodb';
import { WeiboModule } from '@pro/weibo';
import { WorkflowModule } from '@pro/workflow';
import { RedisClient, redisConfigFactory } from '@pro/redis';
import { createDatabaseConfig, WeiboAccountEntity } from '@pro/entities';
import {
  createCrawlerRuntimeConfig,
  createRabbitConfig,
  createWeiboTaskConfig,
} from './config/crawler.config';
import { StorageService } from './services/storage.service';
import { CrawlerServiceV2 } from './services/crawler-v2.service';
import { WorkflowFactory } from './workflow-factory';
import { CrawlQueueConsumer } from './crawl-queue.consumer';
import { BrowserGuardianService } from './services/browser-guardian.service';
import { WeiboAccountService } from './services/weibo-account.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/crawler',
      }),
    ),
    MongodbModule.forRoot(),
    WeiboModule,
    WorkflowModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
    }),
    TypeOrmModule.forFeature([WeiboAccountEntity]),
  ],
  controllers: [HealthController],
  providers: [
    BrowserGuardianService,
    StorageService,
    WeiboAccountService,
    WorkflowFactory,
    CrawlerServiceV2,
    CrawlQueueConsumer,
    {
      provide: 'CRAWLER_RUNTIME_CONFIG',
      inject: [ConfigService],
      useFactory: createCrawlerRuntimeConfig,
    },
    {
      provide: 'RABBIT_CONFIG',
      inject: [ConfigService],
      useFactory: createRabbitConfig,
    },
    {
      provide: 'WEIBO_CONFIG',
      inject: [ConfigService],
      useFactory: createWeiboTaskConfig,
    },
    {
      provide: RedisClient,
      useFactory: (configService: ConfigService) => {
        return new RedisClient(redisConfigFactory(configService));
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
