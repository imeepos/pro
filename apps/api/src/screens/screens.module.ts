import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { ScreensGateway } from './screens.gateway';
import { ScreensStatsScheduler } from './screens-stats.scheduler';
import { ScreenPageEntity } from '../entities/screen-page.entity';
import { WeiboModule } from '../weibo/weibo.module';
import { getJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScreenPageEntity]),
    JwtModule.register(getJwtConfig()),
    forwardRef(() => WeiboModule),
  ],
  controllers: [ScreensController],
  providers: [ScreensService, ScreensGateway, ScreensStatsScheduler],
  exports: [ScreensService, ScreensGateway],
})
export class ScreensModule {}
