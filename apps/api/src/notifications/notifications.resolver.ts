import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver, Args, Subscription } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationInput } from './dto/notification.dto';
import { NotificationModel } from './models/notification.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { NOTIFICATION_EVENTS } from './constants/notification-events';

@Resolver(() => NotificationModel)
@UseGuards(CompositeAuthGuard)
export class NotificationsResolver {
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pubSub: PubSubService,
  ) {}

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

  @Subscription(() => NotificationModel, {
    name: 'notificationReceived',
    filter: (payload: NotificationModel, _variables, context) => {
      const userId = context.req?.user?.userId;
      if (!userId) return false;
      return !payload.userId || payload.userId === userId;
    },
  })
  notificationReceived(@CurrentUser('userId') _userId: string) {
    return this.pubSub.asyncIterator(NOTIFICATION_EVENTS.RECEIVED);
  }
}
