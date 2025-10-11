import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { createDatabaseConfig } from './config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
    }),
    ConfigModule,
    AuthModule,
    UserModule,
    WeiboModule,
    JdModule,
    ScreensModule,
    EventsModule,
    MediaTypeModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
