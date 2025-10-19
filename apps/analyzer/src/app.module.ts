import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { AnalysisResultEntity } from '@pro/entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { AnalysisQueueConsumer } from './consumers/analysis-queue.consumer';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { NLPAnalysisService } from './services/nlp-analysis.service';
import { LLMAnalysisService } from './services/llm-analysis.service';
import analyzerConfig from './config/analyzer.config';
import { createDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [analyzerConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
    }),
    TypeOrmModule.forFeature([AnalysisResultEntity]),
    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: '@pro/analyzer',
        logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      }),
    ),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RabbitMQService,
    AnalysisQueueConsumer,
    SentimentAnalysisService,
    NLPAnalysisService,
    LLMAnalysisService,
  ],
})
export class AppModule {}
