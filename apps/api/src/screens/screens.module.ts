import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { ScreensGateway } from './screens.gateway';
import { ScreenPageEntity } from '../entities/screen-page.entity';
import { getJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScreenPageEntity]),
    JwtModule.register(getJwtConfig()),
  ],
  controllers: [ScreensController],
  providers: [ScreensService, ScreensGateway],
  exports: [ScreensService, ScreensGateway],
})
export class ScreensModule {}
