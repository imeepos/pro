import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JdAuthService } from './jd-auth.service';
import { observableToAsyncIterator } from '../common/utils/observable.utils';
import {
  JdLoginEventModel,
  JdLoginSessionModel,
  mapJdLoginEventToModel,
  mapJdLoginSnapshotToModel,
} from './models/jd-login.model';
import { concat, EMPTY, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Resolver(() => JdLoginSessionModel)
@UseGuards(JwtAuthGuard)
export class JdAuthResolver {
  constructor(private readonly jdAuthService: JdAuthService) {}

  @Mutation(() => JdLoginSessionModel, { name: 'startJdLogin' })
  async startLogin(@CurrentUser('userId') userId: string): Promise<JdLoginSessionModel> {
    const { sessionId } = await this.jdAuthService.createLoginSession(userId);
    const snapshot = this.jdAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapJdLoginSnapshotToModel(snapshot);
  }

  @Query(() => JdLoginSessionModel, { name: 'jdLoginSession' })
  async getSession(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
  ): Promise<JdLoginSessionModel> {
    const snapshot = this.jdAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapJdLoginSnapshotToModel(snapshot);
  }

  @Subscription(() => JdLoginEventModel, { name: 'jdLoginEvents' })
  jdLoginEvents(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
  ) {
    const snapshot = this.jdAuthService.getLoginSessionSnapshot(sessionId);
    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    const initial$ = snapshot.lastEvent ? of(snapshot.lastEvent) : EMPTY;
    const events$ = concat(initial$, this.jdAuthService.observeLoginSession(sessionId)).pipe(
      map((event) => mapJdLoginEventToModel(event)),
    );

    return observableToAsyncIterator(events$);
  }
}
