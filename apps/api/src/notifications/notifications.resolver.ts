import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver, Args, Subscription, Context } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationInput } from './dto/notification.dto';
import { NotificationModel } from './models/notification.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { NOTIFICATION_EVENTS } from './constants/notification-events';
import { SubscriptionAccessService } from '../auth/services/subscription-access.service';
import { GraphqlContext } from '../common/utils/context.utils';

@Resolver(() => NotificationModel)
@UseGuards(CompositeAuthGuard)
export class NotificationsResolver {
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pubSub: PubSubService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {
    this.pubSub.registerChannel(NOTIFICATION_EVENTS.RECEIVED, {
      description: 'Real-time notification stream',
      requiredScopes: ['authenticated'],
    });
  }

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
    filter: (payload: NotificationModel, _variables, context: GraphqlContext) => {
      try {
        this.subscriptionAccess.assertCanSubscribe(context, NOTIFICATION_EVENTS.RECEIVED);
      } catch {
        return false;
      }

      const userId = context.req?.user?.userId;
      if (!userId) return false;
      return !payload.userId || payload.userId === userId;
    },
  })
  notificationReceived(@CurrentUser('userId') _userId: string, @Context() context: GraphqlContext) {
    this.subscriptionAccess.assertCanSubscribe(context, NOTIFICATION_EVENTS.RECEIVED);
    return this.pubSub.asyncIterator(NOTIFICATION_EVENTS.RECEIVED);
  }
}
