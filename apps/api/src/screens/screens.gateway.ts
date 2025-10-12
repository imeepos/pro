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
import { LoggedInUsersStats } from '@pro/sdk';
import { WeiboAccountService } from '../weibo/weibo-account.service';

/**
 * 大屏系统 WebSocket Gateway
 * 支持实时数据推送，包括微博已登录用户统计
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
    @Inject(forwardRef(() => WeiboAccountService))
    private readonly weiboAccountService: WeiboAccountService
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
        throw new UnauthorizedException('Missing token');
      }

      // 验证 JWT token
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.userId;

      console.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      client.disconnect();
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
