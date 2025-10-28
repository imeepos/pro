import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createLoggerConfig } from '@pro/logger-nestjs';
import { CrawlQueueConsumer } from './crawl-queue.consumer';
import { MongodbModule } from '@pro/mongodb';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
  controllers: [],
  providers: [
    CrawlQueueConsumer,
    MongodbModule
  ],
})
export class AppModule {}
