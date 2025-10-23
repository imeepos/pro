import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WeiboPostEntity,
  WeiboCommentEntity,
  WeiboUserEntity,
  WeiboHashtagEntity,
  WeiboPostHashtagEntity,
  WeiboUserStatsEntity,
  WeiboMediaEntity,
  WeiboInteractionEntity,
  WeiboPostMentionEntity,
} from '@pro/entities';
import {
  RawDataSource,
  RawDataSourceSchema,
} from '@pro/mongodb';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { RawDataConsumer } from './consumers/raw-data.consumer';
import { RawDataService } from './services/raw-data.service';
import {
  createMongoDBConfig,
  createRabbitMQConfig,
  createCleanerConfig,
} from './config';
import { createDatabaseConfig } from '@pro/entities';
import { CleanTaskFactory } from './tasks/clean-task-factory';
import { CleanerService } from './services/cleaner.service';
import { WeiboPersistenceService } from './services/weibo-persistence.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = createDatabaseConfig(configService);
        return {
          ...config,
          entities: [
            WeiboPostEntity,
            WeiboCommentEntity,
            WeiboUserEntity,
            WeiboMediaEntity,
            WeiboHashtagEntity,
            WeiboPostHashtagEntity,
            WeiboUserStatsEntity,
            WeiboInteractionEntity,
            WeiboPostMentionEntity,
          ],
          synchronize: false,
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
    }),
    TypeOrmModule.forFeature([
      WeiboPostEntity,
      WeiboCommentEntity,
      WeiboUserEntity,
      WeiboMediaEntity,
      WeiboHashtagEntity,
      WeiboPostHashtagEntity,
      WeiboUserStatsEntity,
      WeiboInteractionEntity,
      WeiboPostMentionEntity,
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = createMongoDBConfig(configService);
        return {
          uri: config.uri,
          connectionFactory: (connection) => {
            const logger = new Logger('MongooseConnection');
            connection.on('connected', () => {
              logger.log('MongoDB 连接成功');
            });
            connection.on('error', (error) => {
              logger.error('MongoDB 连接错误:', error);
            });
            connection.on('disconnected', () => {
              logger.log('MongoDB 连接断开');
            });
            return connection;
          },
        };
      },
    }),
    MongooseModule.forFeature([
      {
        name: RawDataSource.name,
        schema: RawDataSourceSchema,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RabbitMQService,
    RawDataService,
    CleanTaskFactory,
    WeiboPersistenceService,
    CleanerService,
    RawDataConsumer,
    {
      provide: 'RABBITMQ_CONFIG',
      inject: [ConfigService],
      useFactory: createRabbitMQConfig,
    },
    {
      provide: 'CLEANER_CONFIG',
      inject: [ConfigService],
      useFactory: createCleanerConfig,
    },
  ],
})
export class AppModule {}
