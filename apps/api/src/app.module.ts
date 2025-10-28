import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { LoggerModule, createLoggerConfig } from '@pro/logger-nestjs';
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
import { DlqModule } from './dlq/dlq.module';
import { RabbitMQModule as BaseRabbitMQModule } from '@pro/rabbitmq';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { TasksModule } from './tasks/tasks.module';
import { createDatabaseConfig } from '@pro/entities';
import { AugmentedRequest, GraphqlContext } from './common/utils/context.utils';
import { UserLoader } from './user/user.loader';
import { GraphqlLoaders } from './common/dataloaders/types';
import { ApiKeyLoader } from './auth/api-key.loader';
import { GraphqlWsAuthService } from './auth/services/graphql-ws-auth.service';
import { GraphqlWsContextCreator } from './auth/utils/graphql-ws-context.util';
import { ConnectionGatekeeper, ConnectionRateLimitException } from './auth/services/connection-gatekeeper.service';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ConnectionMetricsService } from './monitoring/connection-metrics.service';
import { EventTypeLoader } from './events/event-type.loader';
import { IndustryTypeLoader } from './events/industry-type.loader';
import { TagLoader } from './events/tag.loader';
import { DateTimeScalar } from './common/scalars/date-time.scalar';
import { McpModule } from './mcp/mcp.module';
import { GraphqlExecutorModule } from './mcp/graphql-executor.module';
import { WorkflowModule } from './workflow/workflow.module';

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
      imports: [LoadersModule, AuthModule, MonitoringModule],
      inject: [
        ConfigService,
        UserLoader,
        ApiKeyLoader,
        EventTypeLoader,
        IndustryTypeLoader,
        TagLoader,
        GraphqlWsAuthService,
        ConnectionGatekeeper,
        ConnectionMetricsService,
      ],
      useFactory: (
        configService: ConfigService,
        userLoader: UserLoader,
        apiKeyLoader: ApiKeyLoader,
        eventTypeLoader: EventTypeLoader,
        industryTypeLoader: IndustryTypeLoader,
        tagLoader: TagLoader,
        wsAuthService: GraphqlWsAuthService,
        connectionGatekeeper: ConnectionGatekeeper,
        connectionMetrics: ConnectionMetricsService,
      ): ApolloDriverConfig => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const graphqlWsInitTimeout = Number(configService.get('GRAPHQL_WS_CONNECTION_INIT_TIMEOUT') ?? 15000);

        const wsContextCreator = new GraphqlWsContextCreator(
          wsAuthService,
          userLoader,
          apiKeyLoader,
          eventTypeLoader,
          industryTypeLoader,
          tagLoader,
          connectionGatekeeper,
          connectionMetrics,
        );

        return {
          autoSchemaFile: join(process.cwd(), 'apps', 'api', 'schema.graphql'),
          sortSchema: true,
          path: '/graphql',
          graphiql: true,
          introspection: !isProduction,
          subscriptions: {
            'graphql-ws': {
              connectionInitWaitTimeout: graphqlWsInitTimeout,
              onConnect: async (context: any) => {
                try {
                  const connectionContext = await wsContextCreator.createConnectionContext(
                    context.connectionParams,
                    context.socket,
                    context,
                  );
                  return {
                    context: connectionContext,
                  };
                } catch (error) {
                  const reason =
                    error instanceof ConnectionRateLimitException
                      ? error.message
                      : error?.message ?? 'Authentication failed';

                  const close = context?.extra?.socket?.close?.bind(context.extra.socket);
                  if (close) {
                    const code = error instanceof ConnectionRateLimitException ? 4408 : 4401;
                    close(code, reason);
                  }

                  throw error;
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
    BaseRabbitMQModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
        maxRetries: 3,
        enableDLQ: true,
      }),
    }),

    ConfigModule,
    DatabaseModule,
    RabbitMQModule,
    AuthModule,
    MonitoringModule,
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
    WorkflowModule,
    DlqModule,
    TasksModule,
    GraphqlExecutorModule,
    McpModule,
  ],
  controllers: [],
  providers: [HealthResolver, DateTimeScalar],
})
export class AppModule {}
