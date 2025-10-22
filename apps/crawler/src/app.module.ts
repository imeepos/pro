import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { MongodbModule } from '@pro/mongodb';
import {
  createCrawlerRuntimeConfig,
  createRabbitConfig,
  createWeiboTaskConfig,
} from './config/crawler.config';
import { HtmlFetcherService } from './services/html-fetcher.service';
import { AjaxFetcherService } from './services/ajax-fetcher.service';
import { StorageService } from './services/storage.service';
import { TaskFactory } from './tasks/task-factory';
import { CrawlerService } from './services/crawler.service';
import { CrawlQueueConsumer } from './crawl-queue.consumer';

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
  ],
  providers: [
    HtmlFetcherService,
    AjaxFetcherService,
    StorageService,
    TaskFactory,
    CrawlerService,
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
  ],
})
export class AppModule {}
