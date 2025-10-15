import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { join } from 'path';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { createDatabaseConfig } from '@pro/entities';
import { BugModule } from './bug/bug.module';
import { HealthResolver } from './health.resolver';
import { UuidValidationExceptionFilter } from './common/filters/uuid-validation-exception.filter';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/bugger',
    })),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'apps', 'bugger', 'schema.graphql'),
          sortSchema: true,
          path: '/graphql',
          playground: !isProduction,
          introspection: !isProduction,
          plugins: isProduction ? [ApolloServerPluginLandingPageDisabled()] : [],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService) as TypeOrmModuleOptions,
    }),
    BugModule,
  ],
  controllers: [],
  providers: [
    HealthResolver,
    {
      provide: APP_FILTER,
      useClass: UuidValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AppModule {}