import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NotificationModel } from './models/notification.model';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { NOTIFICATION_EVENTS } from './constants/notification-events';

@Injectable()
export class NotificationsService {
  private readonly notificationStream = new Subject<NotificationModel>();

  constructor(private readonly pubSub: PubSubService) {}

  publish(notification: NotificationModel): void {
    this.notificationStream.next(notification);
    this.pubSub.publish(NOTIFICATION_EVENTS.RECEIVED, notification);
  }

  observeForUser(userId: string): Observable<NotificationModel> {
    return this.notificationStream.asObservable().pipe(
      filter(notification => !notification.userId || notification.userId === userId)
    );
  }
}
