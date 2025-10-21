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

// 微博数据处理服务 - 融合智慧的数字清洗艺术品
import { WeiboContentParser } from './data-cleaner/weibo-content-parser.service';
import { WeiboDataCleaner } from './data-cleaner/weibo-data-cleaner.service';

import {
  createCrawlerConfig,
  createRabbitMQConfig,
  createMongoDBConfig,
  createWeiboConfig,
} from './config/crawler.config';
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
            contentHash: { type: String, required: true, index: true },
            metadata: { type: Object, default: {} },
            status: {
              type: String,
              enum: ['pending', 'processed', 'failed'],
              default: 'pending',
              index: true,
            },
            createdAt: { type: Date, default: Date.now, index: true },
            updatedAt: { type: Date, default: Date.now },
          },
          {
            timestamps: true,
            collection: 'raw_data_sources',
          },
        ),
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
  ],
})
export class AppModule {}
