import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerModule, createLoggerConfig } from '@pro/logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
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
import { createDatabaseConfig } from './config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/api',
    })),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService) as TypeOrmModuleOptions,
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
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
