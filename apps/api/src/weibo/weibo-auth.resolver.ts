import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WeiboAuthService } from './weibo-auth.service';
import { observableToAsyncIterator } from '../common/utils/observable.utils';
import {
  WeiboLoginEventModel,
  WeiboLoginSessionModel,
  mapWeiboLoginEventToModel,
  mapWeiboLoginSnapshotToModel,
} from './models/weibo-login.model';
import { concat, EMPTY, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => WeiboLoginSessionModel)
@UseGuards(CompositeAuthGuard)
export class WeiboAuthResolver {
  constructor(private readonly weiboAuthService: WeiboAuthService) {}

  @Mutation(() => WeiboLoginSessionModel, { name: 'startWeiboLogin' })
  async startLogin(@CurrentUser('userId') userId: string): Promise<WeiboLoginSessionModel> {
    const { sessionId } = await this.weiboAuthService.createLoginSession(userId);
    const snapshot = this.weiboAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapWeiboLoginSnapshotToModel(snapshot);
  }

  @Query(() => WeiboLoginSessionModel, { name: 'weiboLoginSession' })
  async getSession(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
  ): Promise<WeiboLoginSessionModel> {
    const snapshot = this.weiboAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapWeiboLoginSnapshotToModel(snapshot);
  }

  @Subscription(() => WeiboLoginEventModel, { name: 'weiboLoginEvents' })
  weiboLoginEvents(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
  ) {
    const snapshot = this.weiboAuthService.getLoginSessionSnapshot(sessionId);
    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    const initial$ = snapshot.lastEvent ? of(snapshot.lastEvent) : EMPTY;
    const events$ = concat(initial$, this.weiboAuthService.observeLoginSession(sessionId)).pipe(
      map((event) => mapWeiboLoginEventToModel(event)),
    );

    return observableToAsyncIterator(events$);
  }
}
