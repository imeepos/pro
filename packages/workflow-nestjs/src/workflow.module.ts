import { Module, OnModuleInit, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { MongodbModule } from '@pro/mongodb';
import { RabbitMQModule } from '@pro/rabbitmq';
import {
    WeiboAccountEntity,
    WeiboPostEntity,
    WeiboCommentEntity,
    WeiboUserEntity,
    WeiboHashtagEntity,
    WeiboPostHashtagEntity,
    WeiboMediaEntity,
    WeiboUserStatsEntity,
    createDatabaseConfig
} from '@pro/entities';
import { RedisClient } from '@pro/redis';
import { WeiboModule } from '@pro/weibo';

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
import { RateLimiterService } from './services/rate-limiter.service';
import { EmbeddedCleanerService } from './services/embedded-cleaner.service';

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
            useFactory: (configService: ConfigService) => {
                const config = createDatabaseConfig(configService);
                return {
                    ...config,
                    retryAttempts: 1,
                    retryDelay: 1000,
                };
            },
        }),
        TypeOrmModule.forFeature([
            WeiboAccountEntity,
            WeiboPostEntity,
            WeiboCommentEntity,
            WeiboUserEntity,
            WeiboHashtagEntity,
            WeiboPostHashtagEntity,
            WeiboMediaEntity,
            WeiboUserStatsEntity,
        ]),
        MongodbModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const mongoUrl = configService.get('MONGODB_URL', 'mongodb://localhost:27017/pro');
                return {
                    uri: mongoUrl.trim(),
                };
            },
        }),
        RabbitMQModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const rabbitUrl = configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
                return {
                    url: rabbitUrl.trim(),
                    messageTTL: 1800000, // 30 分钟，与旧队列配置保持一致
                };
            },
        }),
        WeiboModule,
    ],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get('REDIS_URL');
                if (redisUrl) {
                    return new RedisClient(redisUrl.trim());
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
        {
            provide: RedisClient,
            useFactory: (redisClient: RedisClient) => redisClient,
            inject: ['REDIS_CLIENT'],
        },
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        RateLimiterService,
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
        EmbeddedCleanerService,
    ],
    exports: [
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        RateLimiterService,
        WeiboHtmlParser,
        MainSearchWorkflow,
        UserProfileWorkflow,
        EmbeddedCleanerService,
        RedisClient,
    ],
})
export class WorkflowModule implements OnModuleInit {
    onModuleInit() {}
}