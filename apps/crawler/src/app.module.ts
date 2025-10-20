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
import { WeiboDetailCrawlerService } from './weibo/detail-crawler.service';
import { WeiboCommentCrawlerService } from './weibo/comment-crawler.service';
import { WeiboCreatorCrawlerService } from './weibo/creator-crawler.service';
import { WeiboMediaDownloaderService } from './weibo/media-downloader.service';
import { RawDataService } from './raw-data/raw-data.service';
import { CrawlQueueConsumer } from './crawl-queue.consumer';
import { RobotsService } from './robots/robots.service';
import { RequestMonitorService } from './monitoring/request-monitor.service';
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
    WeiboDetailCrawlerService,
    WeiboCommentCrawlerService,
    WeiboCreatorCrawlerService,
    WeiboMediaDownloaderService,
    RawDataService,
    CrawlQueueConsumer,
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
