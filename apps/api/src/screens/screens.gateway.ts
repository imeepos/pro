import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggedInUsersStats } from '@pro/types';
import { WeiboAccountService } from '../weibo/weibo-account.service';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { SUBSCRIPTION_EVENTS } from './constants/subscription-events';

/**
 * 大屏系统 WebSocket Gateway
 * 支持多命名空间实时数据推送：
 * - /screens: 大屏内容和微博数据
 * - /notifications: 系统通知
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/screens',
})
export class ScreensGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ScreensGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly pubSub: PubSubService,
    @Inject(forwardRef(() => WeiboAccountService))
    private readonly weiboAccountService: WeiboAccountService,
  ) {}

  async onModuleInit() {
    // 启动时广播首帧数据
    await this.broadcastInitialStats();
  }

  /**
   * WebSocket 连接时的 JWT 认证
   * token 通过握手时的 auth.token 传递
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.emit('auth:error', { message: 'Missing token', code: 'MISSING_TOKEN' });
        setTimeout(() => client.disconnect(), 1000);
        return;
      }

      // 验证 JWT token
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.userId;

      console.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);

      // 发送认证失败事件给客户端
      const errorCode = error.message.includes('jwt expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      client.emit('auth:error', {
        message: error.message,
        code: errorCode
      });

      // 延迟断开连接，确保客户端收到错误消息
      setTimeout(() => client.disconnect(), 1000);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 广播微博已登录用户统计更新
   */
  broadcastWeiboLoggedInUsersUpdate(stats: LoggedInUsersStats) {
    this.server.emit('weibo:logged-in-users:update', stats);
    this.pubSub.publish(SUBSCRIPTION_EVENTS.WEIBO_LOGGED_IN_USERS_UPDATE, stats);
  }

  /**
   * 启动时广播初始统计数据
   */
  private async broadcastInitialStats() {
    try {
      const stats = await this.weiboAccountService.getLoggedInUsersStats();
      this.broadcastWeiboLoggedInUsersUpdate(stats);
      this.logger.log('广播初始微博用户统计数据', stats);
    } catch (error) {
      this.logger.error('获取初始统计数据失败:', error);
    }
  }
}
