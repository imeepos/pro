import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JdAuthService, JdLoginEvent, JdLoginEventEnvelope } from './jd-auth.service';
import { asyncIteratorToObservable, observableToAsyncIterator } from '../common/utils/observable.utils';
import {
  JdLoginEventModel,
  JdLoginSessionModel,
  mapJdLoginEventToModel,
  mapJdLoginSnapshotToModel,
} from './models/jd-login.model';
import { concat, EMPTY, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { PinoLogger } from '@pro/logger';
import { GraphqlContext } from '../common/utils/context.utils';

@Resolver(() => JdLoginSessionModel)
@UseGuards(CompositeAuthGuard)
export class JdAuthResolver {
  constructor(
    private readonly jdAuthService: JdAuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JdAuthResolver.name);
  }

  @Mutation(() => JdLoginSessionModel, { name: 'startJdLogin' })
  async startLogin(@CurrentUser('userId') userId: string): Promise<JdLoginSessionModel> {
    const { sessionId } = await this.jdAuthService.createLoginSession(userId);
    const snapshot = await this.jdAuthService.getLoginSessionSnapshot(sessionId);

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
    const snapshot = await this.jdAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapJdLoginSnapshotToModel(snapshot);
  }

  @Subscription(() => JdLoginEventModel, { name: 'jdLoginEvents' })
  async jdLoginEvents(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
    @Context() context: GraphqlContext,
  ): Promise<AsyncIterableIterator<JdLoginEventModel>> {
    const errorEvent = (cause: unknown, code?: string): JdLoginEventModel => {
      const rootCause = cause instanceof Error ? cause : new Error('未知的登录事件错误');
      const payload: JdLoginEvent = {
        type: 'error',
        data: {
          message: rootCause.message,
          ...(code ? { code } : {}),
        },
      };
      return mapJdLoginEventToModel(payload);
    };

    const fail = (cause: unknown, code?: string): AsyncIterableIterator<JdLoginEventModel> =>
      observableToAsyncIterator(of<JdLoginEventModel>(errorEvent(cause, code)));

    if (context?.authenticationError) {
      return fail(new Error(`WebSocket认证失败: ${context.error ?? '未知错误'}`), 'AUTHENTICATION_FAILED');
    }

    if (!userId) {
      return fail(new Error('WebSocket认证信息缺失'), 'MISSING_USER_INFO');
    }

    try {
      const snapshot = await this.jdAuthService.getLoginSessionSnapshot(sessionId);

      if (snapshot.userId !== userId) {
        throw new ForbiddenException('无权访问该登录会话');
      }

      if (snapshot.isExpired) {
        return fail(new ForbiddenException('登录会话已过期，请重新开始'));
      }

      const historical$: Observable<JdLoginEventModel> = snapshot.lastEvent
        ? of(mapJdLoginEventToModel(snapshot.lastEvent))
        : (EMPTY as Observable<JdLoginEventModel>);

      const channel = this.jdAuthService.getLoginEventChannel(sessionId);
      this.logger.debug('订阅京东登录事件', { userId, sessionId, channel });

      let liveIterator: AsyncIterator<JdLoginEventEnvelope>;
      try {
        liveIterator = this.jdAuthService.createLoginEventsIterator(sessionId);
      } catch (error) {
        return fail(error);
      }

      const live$ = asyncIteratorToObservable(liveIterator).pipe(
        map((payload) => {
          this.logger.debug('接收京东登录事件', {
            userId,
            sessionId,
            eventType: payload.event.type,
          });
          return mapJdLoginEventToModel(payload.event);
        }),
        catchError((error): Observable<JdLoginEventModel> => of(errorEvent(error))),
      );

      return observableToAsyncIterator(concat(historical$, live$));
    } catch (error) {
      return fail(error);
    }
  }
}
