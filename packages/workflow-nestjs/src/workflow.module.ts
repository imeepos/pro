import { Module, OnModuleInit, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { MongodbModule } from '@pro/mongodb';
import { RabbitMQModule } from '@pro/rabbitmq';
import { WeiboAccountEntity } from '@pro/entities';
import { RedisClient } from '@pro/redis';

import { PlaywrightAstVisitor } from './PlaywrightAstVisitor';
import { WeiboSearchUrlBuilderAstVisitor } from './WeiboSearchUrlBuilderAstVisitor';
import { ExecutorService } from './services/executor.service';
import { WeiboAccountService } from './services/weibo-account.service';
import { WeiboAccountAstVisitor } from './WeiboAccountAstVisitor';
import {
    FetchPostDetailVisitor,
    FetchCommentsVisitor,
    FetchLikesVisitor,
    SavePostDetailVisitor,
} from './workflows/post-detail.visitor';
import { AccountHealthService } from './services/account-health.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { PriorityQueueService } from './services/priority-queue.service';
import { WeiboHtmlParser } from './parsers/weibo-html.parser';
import { MainSearchWorkflow } from './workflows/main-search.workflow';
import { UserBehaviorAnalyzerService } from './services/user-behavior-analyzer.service';
import { BotDetectorService } from './services/bot-detector.service';
import { SpamDetectorService } from './services/spam-detector.service';
import { UserProfileVisitor } from './visitors/user-profile.visitor';
import { UserProfileWorkflow } from './workflows/user-profile.workflow';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        LoggerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return createLoggerConfig({
                    serviceName: '@pro/workflow-nestjs',
                    logLevel: configService.get('LOG_LEVEL', 'info'),
                });
            },
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'postgres'),
                password: configService.get('DB_PASSWORD', ''),
                database: configService.get('DB_NAME', 'pro'),
                entities: [WeiboAccountEntity],
                synchronize: false,
                retryAttempts: 1,
                retryDelay: 1000,
                autoLoadEntities: false,
            }),
        }),
        TypeOrmModule.forFeature([WeiboAccountEntity]),
        MongodbModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get('MONGODB_URL', 'mongodb://localhost:27017/pro'),
            }),
        }),
        RabbitMQModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                url: configService.get('RABBITMQ_URL', 'amqp://localhost:5672'),
            }),
        }),
    ],
    providers: [
        {
            provide: RedisClient,
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get('REDIS_URL');
                if (redisUrl) {
                    return new RedisClient(redisUrl);
                }
                const redisConfig: any = {
                    host: configService.get('REDIS_HOST', 'localhost'),
                    port: configService.get('REDIS_PORT', 6379),
                    retryStrategy: (times: number) => Math.min(times * 50, 2000),
                };
                const password = configService.get<string>('REDIS_PASSWORD');
                if (password) {
                    redisConfig.password = password;
                }
                return new RedisClient(redisConfig);
            },
            inject: [ConfigService],
        },
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        WeiboHtmlParser,
        MainSearchWorkflow,
        PlaywrightAstVisitor,
        WeiboAccountAstVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        FetchPostDetailVisitor,
        FetchCommentsVisitor,
        FetchLikesVisitor,
        SavePostDetailVisitor,
        UserBehaviorAnalyzerService,
        BotDetectorService,
        SpamDetectorService,
        UserProfileVisitor,
        UserProfileWorkflow,
    ],
    exports: [
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        WeiboHtmlParser,
        MainSearchWorkflow,
        UserProfileWorkflow,
        RedisClient,
    ],
})
export class WorkflowModule implements OnModuleInit {
    onModuleInit() {}
}