import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountService } from './weibo/account.service';
import { WeiboAccountSelector } from './weibo/account.selector';
import { WeiboAccountHealthMonitor } from './weibo/account.health-monitor';
import { BrowserService } from './browser/browser.service';
import { WeiboSearchCrawlerService } from './weibo/search-crawler.service';
import { WeiboMultiModeCrawlerService } from './weibo/multi-mode-crawler.service';
import { WeiboDetailCrawlerService } from './weibo/detail-crawler.service';
import { WeiboCommentCrawlerService } from './weibo/comment-crawler.service';
import { WeiboCreatorCrawlerService } from './weibo/creator-crawler.service';
import { WeiboMediaDownloaderService } from './weibo/media-downloader.service';
import { RawDataService } from './raw-data/raw-data.service';
import { CrawlQueueConsumer } from './crawl-queue.consumer';
import { RobotsService } from './robots/robots.service';
import { RequestMonitorService } from './monitoring/request-monitor.service';
import { WeiboDetailCrawlerConsumer } from './weibo/weibo-detail-crawler.consumer';

// 微博数据处理服务 - 融合智慧的数字清洗艺术品
import { WeiboContentParser } from './data-cleaner/weibo-content-parser.service';
import { WeiboDataCleaner } from './data-cleaner/weibo-data-cleaner.service';
import { WeiboStatusService } from '@pro/weibo';
import { RawDataSourceService } from '@pro/mongodb';
import { RedisClient, redisConfigFactory } from '@pro/redis';

import {
  createCrawlerConfig,
  createRabbitMQConfig,
  createMongoDBConfig,
  createWeiboConfig,
} from './config/crawler.config';
import { CrawlerConfigurationService } from './config/crawler-configuration.service';
import { createDatabaseConfig } from '@pro/entities';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/crawler',
      }),
    ),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return createDatabaseConfig(configService) as TypeOrmModuleOptions;
      },
    }),
    TypeOrmModule.forFeature([WeiboAccountEntity]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URL',
          'mongodb://localhost:27017/pro',
        );
        return {
          uri,
          connectionFactory: (connection) => {
            const logger = new Logger('MongooseConnection');
            connection.on('connected', () => {
              logger.log('MongoDB连接成功');
            });
            connection.on('error', (error) => {
              logger.error('MongoDB连接错误:', error);
            });
            connection.on('disconnected', () => {
              logger.log('MongoDB连接断开');
            });
            return connection;
          },
        };
      },
    }),
    MongooseModule.forFeature([
      {
        name: 'RawDataSource',
        schema: new (require('mongoose').Schema)(
          {
            sourceType: { type: String, required: true, index: true },
            sourceUrl: { type: String, required: true, unique: true },
            rawContent: { type: String, required: true },
            contentHash: { type: String, required: true, unique: true, sparse: true },
            metadata: { type: Object, default: {} },
            status: {
              type: String,
              enum: ['pending', 'processing', 'processed', 'completed', 'failed', 'duplicate'],
              default: 'pending',
              index: true,
            },
            processedAt: { type: Date },
            errorMessage: { type: String },
            createdAt: { type: Date, default: Date.now, index: true },
            updatedAt: { type: Date, default: Date.now },
          },
          {
            timestamps: true,
            collection: 'raw_data_sources',
            strict: false,
          },
        ),
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    CrawlerConfigurationService,
    AppService,
    WeiboAccountHealthMonitor,
    WeiboAccountSelector,
    WeiboAccountService,
    BrowserService,
    RobotsService,
    RequestMonitorService,
    WeiboSearchCrawlerService,
    WeiboMultiModeCrawlerService,
    WeiboDetailCrawlerService,     // 负责微博详情页的数据爬取
    WeiboCommentCrawlerService,    // 负责评论数据的深度挖掘
    WeiboCreatorCrawlerService,    // 负责博主主页的数据爬取
    WeiboMediaDownloaderService,   // 负责媒体文件的智能下载
    RawDataService,
    CrawlQueueConsumer,
    RawDataSourceService,
    WeiboStatusService,
    WeiboDetailCrawlerConsumer,

    // 微博数据处理服务 - 融合智慧的数字清洗艺术品
    WeiboContentParser,           // 微博内容的智能解析器
    WeiboDataCleaner,             // 微博数据的匠心清洗师
    {
      provide: 'CRAWLER_CONFIG',
      inject: [ConfigService],
      useFactory: createCrawlerConfig,
    },
    {
      provide: 'RABBITMQ_CONFIG',
      inject: [ConfigService],
      useFactory: createRabbitMQConfig,
    },
    {
      provide: 'MONGODB_CONFIG',
      inject: [ConfigService],
      useFactory: createMongoDBConfig,
    },
    {
      provide: 'WEIBO_CONFIG',
      inject: [ConfigService],
      useFactory: createWeiboConfig,
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
