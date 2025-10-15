import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { createJwtConfig } from '../config';
import { NotificationsResolver } from './notifications.resolver';

@Module({
  imports: [
    JwtModule.registerAsync(createJwtConfig()),
  ],
  providers: [NotificationsGateway, NotificationsResolver],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
