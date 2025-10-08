import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

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
   * 推送格式：{ total: number, todayNew: number, online: number }
   */
  broadcastWeiboLoggedInUsersUpdate(stats: {
    total: number;
    todayNew: number;
    online: number;
  }) {
    this.server.emit('weibo:logged-in-users:update', stats);
  }
}
