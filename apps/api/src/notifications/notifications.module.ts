import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { createJwtConfig } from '../config';
import { PubSubModule } from '../common/pubsub/pubsub.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    JwtModule.registerAsync(createJwtConfig()),
    PubSubModule,
    AuthModule,
  ],
  providers: [NotificationsGateway, NotificationsService, NotificationsResolver],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
