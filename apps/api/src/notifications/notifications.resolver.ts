import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver, Args } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { NotificationsGateway } from './notifications.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationInput } from './dto/notification.dto';
import { NotificationModel } from './models/notification.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => NotificationModel)
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  @Mutation(() => NotificationModel, { name: 'dispatchNotification' })
  async dispatchNotification(
    @Args('input', { type: () => NotificationInput }) input: NotificationInput,
    @CurrentUser('userId') _requesterId: string,
  ): Promise<NotificationModel> {
    const payload: NotificationModel = {
      id: input.id ?? randomUUID(),
      title: input.title,
      message: input.message,
      timestamp: input.timestamp ?? new Date(),
      userId: input.userId ?? undefined,
    };

    if (payload.userId) {
      this.notificationsGateway.sendToUser(payload.userId, payload);
    } else {
      this.notificationsGateway.broadcastNotification(payload);
    }

    return {
      ...payload,
      userId: payload.userId ?? undefined,
    };
  }
}
