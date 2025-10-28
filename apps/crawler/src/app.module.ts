import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { WeiboModule } from '@pro/weibo';
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
    WeiboModule,
  ],
  controllers: [],
  providers: [
    CrawlQueueConsumer
  ],
})
export class AppModule {}
