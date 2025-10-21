import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PubSubService } from '../../common/pubsub/pubsub.service';
import { GraphqlContext } from '../../common/utils/context.utils';
import { AuthUtils } from '../utils/auth-utils';

@Injectable()
export class SubscriptionAccessService {
  private readonly logger = new Logger(SubscriptionAccessService.name);

  constructor(private readonly pubSub: PubSubService) {}

  assertCanSubscribe(context: GraphqlContext, trigger: string): void {
    const metadata = this.pubSub.getChannelMetadata(trigger);
    if (!metadata) {
      return;
    }

    const request = context.req;
    const isAuthenticated = AuthUtils.isAuthenticated(request);

    if (metadata.allowAnonymous && !metadata.requiredScopes?.length) {
      return;
    }

    if (!isAuthenticated) {
      this.logger.warn(`拒绝未认证订阅: trigger=${trigger}`);
      throw new ForbiddenException('订阅需要认证');
    }

    const scopes = metadata.requiredScopes ?? ['authenticated'];
    for (const scope of scopes) {
      if (scope === 'authenticated') {
        continue;
      }

      if (scope === 'user:self') {
        if (!this.isUserSelfContext(context)) {
          throw new ForbiddenException('仅允许访问自身订阅');
        }
        continue;
      }

      if (!AuthUtils.hasPermission(request as any, scope)) {
        this.logger.warn(`缺少订阅权限: trigger=${trigger}, scope=${scope}`);
        throw new ForbiddenException('缺少订阅权限');
      }
    }
  }

  canPublish(trigger: string): boolean {
    const metadata = this.pubSub.getChannelMetadata(trigger);
    if (!metadata) {
      return true;
    }

    if (metadata.publishScopes && metadata.publishScopes.length > 0) {
      // 发布权限由调用方自行控制，这里只记录声明
      return true;
    }

    return true;
  }

  private isUserSelfContext(context: GraphqlContext): boolean {
    const currentUserId = context.req?.user?.userId;
    const requestedUserId = context.req?.headers?.['x-user-id'];
    return !!currentUserId && (!requestedUserId || requestedUserId === currentUserId);
  }
}
