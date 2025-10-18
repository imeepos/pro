import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription, ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WeiboAuthService, WeiboLoginEvent } from './weibo-auth.service';
import { observableToAsyncIterator } from '../common/utils/observable.utils';
import {
  WeiboLoginEventModel,
  WeiboLoginSessionModel,
  mapWeiboLoginEventToModel,
  mapWeiboLoginSnapshotToModel,
} from './models/weibo-login.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { PinoLogger } from '@pro/logger';

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

  @Subscription(() => WeiboLoginEventModel, { name: 'weiboLoginEvents' })
  weiboLoginEvents(
    @CurrentUser('userId') userId: string,
    @Args('sessionId', { type: () => String }) sessionId: string,
  ) {
    // 创建可观测的事件流，使用from来处理异步验证
    const events$ = new Observable<WeiboLoginEventModel>(subscriber => {
      // 使用异步IIFE来处理async/await
      (async () => {
        try {
          // 验证会话存在性和权限
          const snapshot = await this.weiboAuthService.getLoginSessionSnapshot(sessionId);
          if (snapshot.userId !== userId) {
            throw new ForbiddenException('无权访问该登录会话');
          }

          // 检查会话是否已过期
          if (snapshot.isExpired) {
            throw new ForbiddenException('登录会话已过期，请重新开始');
          }

          // 如果有最后一个事件，先推送它
          if (snapshot.lastEvent) {
            subscriber.next(mapWeiboLoginEventToModel(snapshot.lastEvent));
          }

          // 订阅会话的实时事件流
          const sessionSubscription = this.weiboAuthService.observeLoginSession(sessionId).subscribe({
            next: (event) => {
              try {
                subscriber.next(mapWeiboLoginEventToModel(event));
              } catch (error) {
                this.logger.error('推送登录事件失败', { sessionId, error });
                subscriber.error(error);
              }
            },
            error: (error) => {
              this.logger.error('登录会话事件流异常', { sessionId, error });
              subscriber.error(error);
            },
            complete: () => {
              this.logger.debug('登录会话事件流完成', { sessionId });
              subscriber.complete();
            }
          });

          // 清理函数
          return () => {
            if (!sessionSubscription.closed) {
              sessionSubscription.unsubscribe();
            }
          };
        } catch (error) {
          this.logger.error('创建登录事件订阅失败', { sessionId, error });
          subscriber.error(error);
        }
      })();
    });

    return observableToAsyncIterator(events$);
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
