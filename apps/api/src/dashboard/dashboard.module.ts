import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ScreenPageEntity, EventEntity, WeiboAccountEntity, WeiboSearchTaskEntity } from '@pro/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScreenPageEntity,
      EventEntity,
      WeiboAccountEntity,
      WeiboSearchTaskEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}