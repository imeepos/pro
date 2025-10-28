import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { CrawlQueueConsumer } from './crawl-queue.consumer';
import { MongodbModule } from '@pro/mongodb';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/crawler',
      }),
    )
  ],
  controllers: [],
  providers: [
    CrawlQueueConsumer,
    MongodbModule
  ],
})
export class AppModule {}
