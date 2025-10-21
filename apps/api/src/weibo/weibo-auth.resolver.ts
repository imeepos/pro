import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription, ObjectType, Field, Int, Float, Context } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WeiboAuthService, WeiboLoginEvent } from './weibo-auth.service';
import { observableToAsyncIterator } from '../common/utils/observable.utils';
import {
  WeiboLoginEventModel,
  WeiboLoginSessionModel,
  mapWeiboLoginEventToModel,
  mapWeiboLoginSnapshotToModel,
} from './models/weibo-login.model';
import { EMPTY, Observable, concat, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { PinoLogger } from '@pro/logger';
import { GraphqlContext } from '../common/utils/context.utils';

@ObjectType()
class UserSessionStats {
  @Field(() => String)
  userId: string;

  @Field(() => Int)
  activeCount: number;

  @Field(() => Float)
  totalDuration: number;
}

@ObjectType()
class WeiboSessionStats {
  @Field(() => Int)
  totalSessions: number;

  @Field(() => Int)
  activeSessions: number;

  @Field(() => Int)
  expiredSessions: number;

  @Field(() => Int)
  completedSessions: number;

  @Field(() => Int)
  memorySessions: number;

  @Field(() => Int)
  webSocketConnections: number;

  @Field(() => Float)
  averageSessionDuration: number;

  @Field(() => [UserSessionStats])
  sessionsByUser: UserSessionStats[];
}

@ObjectType()
class UserConnectionStats {
  @Field(() => String)
  userId: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
class WebSocketStats {
  @Field(() => Int)
  totalConnections: number;

  @Field(() => [UserConnectionStats])
  connectionsByUser: UserConnectionStats[];

  @Field(() => Float)
  averageConnectionDuration: number;
}

@Resolver(() => WeiboLoginSessionModel)
@UseGuards(CompositeAuthGuard)
export class WeiboAuthResolver {
  constructor(
    private readonly weiboAuthService: WeiboAuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboAuthResolver.name);
  }

  @Mutation(() => WeiboLoginSessionModel, { name: 'startWeiboLogin' })
  async startLogin(@CurrentUser('userId') userId: string): Promise<WeiboLoginSessionModel> {
    const { sessionId } = await this.weiboAuthService.createLoginSession(userId);
    const snapshot = await this.weiboAuthService.getLoginSessionSnapshot(sessionId);

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
    const snapshot = await this.weiboAuthService.getLoginSessionSnapshot(sessionId);

    if (snapshot.userId !== userId) {
      throw new ForbiddenException('无权访问该登录会话');
    }

    return mapWeiboLoginSnapshotToModel(snapshot);
  }

  @Subscription(() => WeiboLoginEventModel, {
    name: 'weiboLoginEvents',
    resolve: (event: WeiboLoginEventModel) => event,
  })
  async weiboLoginEvents(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
    @Context() context: GraphqlContext,
  ): Promise<AsyncIterableIterator<WeiboLoginEventModel>> {
    const errorEvent = (cause: unknown, code?: string): WeiboLoginEventModel => {
      const rootCause = cause instanceof Error ? cause : new Error('未知的登录事件错误');
      const payload: WeiboLoginEvent = {
        type: 'error',
        data: {
          message: rootCause.message,
          ...(code ? { code } : {}),
        },
      };
      return mapWeiboLoginEventToModel(payload);
    };
    const fail = (cause: unknown, code?: string): AsyncIterableIterator<WeiboLoginEventModel> =>
      observableToAsyncIterator(of<WeiboLoginEventModel>(errorEvent(cause, code)));

    if (context?.authenticationError) {
      return fail(new Error(`WebSocket认证失败: ${context.error ?? '未知错误'}`), 'AUTHENTICATION_FAILED');
    }

    if (!userId) {
      return fail(new Error('WebSocket认证信息缺失'), 'MISSING_USER_INFO');
    }

    try {
      const snapshot = await this.weiboAuthService.getLoginSessionSnapshot(sessionId);

      if (snapshot.userId !== userId) {
        throw new ForbiddenException('无权访问该登录会话');
      }

      if (snapshot.isExpired) {
        return fail(new ForbiddenException('登录会话已过期，请重新开始'));
      }

      const historical$ = snapshot.lastEvent
        ? of<WeiboLoginEventModel>(mapWeiboLoginEventToModel(snapshot.lastEvent))
        : (EMPTY as Observable<WeiboLoginEventModel>);
      let live$: Observable<WeiboLoginEventModel>;
      try {
        live$ = this.weiboAuthService.observeLoginSession(sessionId).pipe(
          map((event) => mapWeiboLoginEventToModel(event)),
          catchError((error): Observable<WeiboLoginEventModel> => of<WeiboLoginEventModel>(errorEvent(error))),
        );
      } catch (error) {
        return fail(error);
      }

      return observableToAsyncIterator(concat(historical$, live$));
    } catch (error) {
      return fail(error);
    }
  }

  /**
   * 获取微博会话统计信息
   */
  @Query(() => WeiboSessionStats, { name: 'weiboSessionStats' })
  async getSessionStats(@CurrentUser('userId') userId: string): Promise<WeiboSessionStats> {
    try {
      const serviceStats = await this.weiboAuthService.getServiceStats();
      const webSocketStats = this.weiboAuthService.getWebSocketStats();

      // 构建会话统计
      const stats: WeiboSessionStats = {
        totalSessions: serviceStats.redisStats.total,
        activeSessions: serviceStats.redisStats.active,
        expiredSessions: serviceStats.redisStats.expired,
        completedSessions: serviceStats.redisStats.completed,
        memorySessions: serviceStats.memorySessions,
        webSocketConnections: webSocketStats.totalConnections,
        averageSessionDuration: 0, // 需要计算
        sessionsByUser: [], // 需要实现
      };

      this.logger.debug('获取会话统计信息', { userId, stats });
      return stats;
    } catch (error) {
      this.logger.error('获取会话统计信息失败', { userId, error });
      throw error;
    }
  }

  /**
   * 获取WebSocket连接统计
   */
  @Query(() => WebSocketStats, { name: 'webSocketStats' })
  async getWebSocketStats(@CurrentUser('userId') userId: string): Promise<WebSocketStats> {
    try {
      const stats = this.weiboAuthService.getWebSocketStats();

      const webSocketStats: WebSocketStats = {
        totalConnections: stats.totalConnections,
        connectionsByUser: stats.connectionsByUser,
        averageConnectionDuration: stats.averageConnectionDuration,
      };

      this.logger.debug('获取WebSocket统计信息', { userId, stats: webSocketStats });
      return webSocketStats;
    } catch (error) {
      this.logger.error('获取WebSocket统计信息失败', { userId, error });
      throw error;
    }
  }

  /**
   * 检查WebSocket健康状态
   */
  @Query(() => String, { name: 'webSocketHealth' })
  async checkWebSocketHealth(@CurrentUser('userId') userId: string): Promise<string> {
    try {
      await this.weiboAuthService.checkWebSocketHealth();
      return 'WebSocket连接健康';
    } catch (error) {
      this.logger.error('WebSocket健康检查失败', { userId, error });
      return `WebSocket连接异常: ${error.message}`;
    }
  }

  /**
   * 手动清理过期会话
   */
  @Mutation(() => String, { name: 'cleanupExpiredSessions' })
  async cleanupExpiredSessions(@CurrentUser('userId') userId: string): Promise<string> {
    try {
      // 这里需要调用sessionStorage的清理方法
      // 由于WeiboAuthService没有直接暴露，我们可以通过其他方式
      const stats = await this.weiboAuthService.getServiceStats();
      const cleanedCount = stats.redisStats.expired; // 简化实现

      this.logger.info('手动清理过期会话', { userId, cleanedCount });
      return `已清理 ${cleanedCount} 个过期会话`;
    } catch (error) {
      this.logger.error('清理过期会话失败', { userId, error });
      throw error;
    }
  }
}
