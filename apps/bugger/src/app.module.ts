import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SwaggerModule } from '@nestjs/swagger';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { createDatabaseConfig } from '@pro/entities';
import { BugModule } from './bug/bug.module';
import { HealthController } from './health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/bugger',
    })),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService) as TypeOrmModuleOptions,
    }),
    BugModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}