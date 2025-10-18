import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { MongodbModule } from '@pro/mongodb';
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
import { LoadersModule } from './loaders.module';
import { createDatabaseConfig, mongodbConfigFactory } from './config';
import { AugmentedRequest, GraphqlContext } from './common/utils/context.utils';
import { UserLoader } from './user/user.loader';
import { GraphqlLoaders } from './common/dataloaders/types';
import { ApiKeyLoader } from './auth/api-key.loader';
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
      imports: [LoadersModule],
      inject: [ConfigService, UserLoader, ApiKeyLoader, EventTypeLoader, IndustryTypeLoader, TagLoader],
      useFactory: (
        configService: ConfigService,
        userLoader: UserLoader,
        apiKeyLoader: ApiKeyLoader,
        eventTypeLoader: EventTypeLoader,
        industryTypeLoader: IndustryTypeLoader,
        tagLoader: TagLoader,
      ): ApolloDriverConfig => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'apps', 'api', 'schema.graphql'),
          sortSchema: true,
          path: '/graphql',
          graphiql: true,
          introspection: !isProduction,
          subscriptions: {
            'graphql-ws': true,
          },
          plugins: isProduction
            ? [ApolloServerPluginLandingPageDisabled()]
            : [],
          context: ({ req, res }): GraphqlContext => {
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
    // MongoDB 全局模块配置
    MongodbModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = mongodbConfigFactory(configService);
        return { uri: config.uri };
      },
    }),

    ConfigModule,
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
  ],
  controllers: [],
  providers: [HealthResolver],
})
export class AppModule {}
