import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScreensService } from './screens.service';
import { ScreensGateway } from './screens.gateway';
import { ScreensStatsScheduler } from './screens-stats.scheduler';
import { ScreenPageEntity } from '@pro/entities';
import { createJwtConfig } from '../config';
import { ScreensResolver } from './screens.resolver';
import { PubSubModule } from '../common/pubsub/pubsub.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScreenPageEntity]),
    JwtModule.registerAsync(createJwtConfig()),
    PubSubModule,
    AuthModule,
  ],
  controllers: [],
  providers: [ScreensService, ScreensGateway, ScreensStatsScheduler, ScreensResolver],
  exports: [ScreensService, ScreensGateway],
})
export class ScreensModule {}
