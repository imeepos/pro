import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * 通知系统 WebSocket Gateway
 * 负责系统通知的实时推送
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

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

      this.logger.log(`Notification client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error('Notification WebSocket authentication failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  /**
   * 广播系统通知
   */
  broadcastNotification(notification: {
    id: string;
    title: string;
    message: string;
    timestamp?: Date;
    userId?: string;
  }) {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date()
    };

    if (notification.userId) {
      // 发送给特定用户
      this.server.emit('notification', payload);
    } else {
      // 广播给所有用户
      this.server.emit('notification', payload);
    }

    this.logger.log('广播通知:', payload.title);
  }

  /**
   * 发送给特定用户的通知
   */
  sendToUser(userId: string, notification: {
    id: string;
    title: string;
    message: string;
    timestamp?: Date;
  }) {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
      userId
    };

    // 这里需要根据实际的用户socket映射来实现
    // 暂时使用房间机制
    this.server.to(`user_${userId}`).emit('notification', payload);
    this.logger.log(`发送给用户 ${userId} 的通知:`, payload.title);
  }
}