import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { PinoLogger } from '@pro/logger';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { HealthResolver } from './health.resolver';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WeiboModule } from './weibo/weibo.module';
import { JdModule } from './jd/jd.module';
import { ScreensModule } from './screens/screens.module';
import { EventsModule } from './events/events.module';
import { MediaTypeModule } from './media-type/media-type.module';
import { ConfigModule } from './config/config.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BugModule } from './bug/bug.module';
import { RawDataModule } from './raw-data/raw-data.module';
import { DatabaseModule } from './database/database.module';
import { LoadersModule } from './loaders.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { TasksModule } from './tasks/tasks.module';
import { createDatabaseConfig } from './config';
import { AugmentedRequest, GraphqlContext } from './common/utils/context.utils';
import { UserLoader } from './user/user.loader';
import { GraphqlLoaders } from './common/dataloaders/types';
import { ApiKeyLoader } from './auth/api-key.loader';
import { GraphqlWsAuthService } from './auth/services/graphql-ws-auth.service';
import { GraphqlWsContextCreator } from './auth/utils/graphql-ws-context.util';
import { EventTypeLoader } from './events/event-type.loader';
import { IndustryTypeLoader } from './events/industry-type.loader';
import { TagLoader } from './events/tag.loader';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/api',
    })),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LoadersModule, AuthModule],
      inject: [
        ConfigService,
        UserLoader,
        ApiKeyLoader,
        EventTypeLoader,
        IndustryTypeLoader,
        TagLoader,
        GraphqlWsAuthService,
      ],
      useFactory: (
        configService: ConfigService,
        userLoader: UserLoader,
        apiKeyLoader: ApiKeyLoader,
        eventTypeLoader: EventTypeLoader,
        industryTypeLoader: IndustryTypeLoader,
        tagLoader: TagLoader,
        wsAuthService: GraphqlWsAuthService,
      ): ApolloDriverConfig => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';

        // 创建 logger 实例用于日志记录
        const logger = new PinoLogger(createLoggerConfig({
          serviceName: '@pro/api',
        }).pinoOptions);
        logger.setContext('GraphQLModule');

        // 创建 WebSocket 上下文处理器
        const wsContextCreator = new GraphqlWsContextCreator(
          wsAuthService,
          userLoader,
          apiKeyLoader,
          eventTypeLoader,
          industryTypeLoader,
          tagLoader,
        );

        return {
          autoSchemaFile: join(process.cwd(), 'apps', 'api', 'schema.graphql'),
          sortSchema: true,
          path: '/graphql',
          graphiql: true,
          introspection: !isProduction,
          subscriptions: {
            'graphql-ws': {
              onConnect: async (context: any) => {
                logger.info('WebSocket 连接尝试', {
                  connectionParams: context.connectionParams,
                  socketId: context.socket?.id,
                });

                try {
                  logger.debug('开始创建 WebSocket 认证上下文');
                  const connectionContext = await wsContextCreator.createConnectionContext(
                    context.connectionParams,
                    context.socket,
                    context,
                  );

                  logger.info('WebSocket 认证成功', {
                    userId: connectionContext.req?.user?.userId,
                    socketId: context.socket?.id,
                  });

                  // 返回包含上下文的对象，符合 graphql-ws 的类型要求
                  return {
                    context: connectionContext,
                  };
                } catch (error) {
                  logger.error('WebSocket 连接认证失败', {
                    error: error.message,
                    stack: error.stack,
                    connectionParams: context.connectionParams,
                    socketId: context.socket?.id,
                  });

                  // 不抛出异常，而是返回一个包含错误信息的上下文
                  // 让订阅能够建立，但在 resolver 中处理认证错误
                  return {
                    context: {
                      error: error.message,
                      req: { user: null },
                      res: {} as any,
                      loaders: {} as any,
                      authenticationError: true,
                    },
                  };
                }
              },
            },
          },
          plugins: isProduction
            ? [ApolloServerPluginLandingPageDisabled()]
            : [],
          context: ({ req, res, connection }): GraphqlContext => {
            // 如果是 WebSocket 连接，使用已认证的上下文
            if (connection && connection.context) {
              return connection.context;
            }

            // HTTP 请求的上下文处理
            const request = req as AugmentedRequest;

            return {
              req: request,
              res,
              loaders: {
                userById: userLoader.create(),
                apiKeyById: apiKeyLoader.create(() => {
                  const currentUser = request.user as { userId?: string } | undefined;
                  return currentUser?.userId;
                }),
                eventTypeById: eventTypeLoader.create(),
                industryTypeById: industryTypeLoader.create(),
                tagById: tagLoader.createById(),
                tagsByEventId: tagLoader.createByEventId(),
              } satisfies GraphqlLoaders,
            };
          },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService) as TypeOrmModuleOptions,
    }),
    // MongoDB 全局模块配置 - 简化同步方式
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || configService.get<string>('MONGODB_URL'),
        maxPoolSize: configService.get<number>('MONGODB_MAX_POOL_SIZE', 10),
        serverSelectionTimeoutMS: configService.get<number>('MONGODB_SERVER_SELECTION_TIMEOUT', 5000),
        socketTimeoutMS: configService.get<number>('MONGODB_SOCKET_TIMEOUT', 45000),
        bufferCommands: configService.get<boolean>('MONGODB_BUFFER_COMMANDS', false),
      }),
    }),

    ConfigModule,
    DatabaseModule,
    RabbitMQModule,
    AuthModule,
    UserModule,
    WeiboModule,
    JdModule,
    ScreensModule,
    EventsModule,
    MediaTypeModule,
    DashboardModule,
    NotificationsModule,
    BugModule,
    RawDataModule,
    TasksModule,
  ],
  controllers: [],
  providers: [HealthResolver],
})
export class AppModule {}
