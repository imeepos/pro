import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { ScreenPageEntity, EventEntity, WeiboAccountEntity, WeiboSearchTaskEntity } from '@pro/entities';
import { DashboardResolver } from './dashboard.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScreenPageEntity,
      EventEntity,
      WeiboAccountEntity,
      WeiboSearchTaskEntity,
    ]),
  ],
  controllers: [],
  providers: [DashboardService, DashboardResolver],
  exports: [DashboardService],
})
export class DashboardModule {}
