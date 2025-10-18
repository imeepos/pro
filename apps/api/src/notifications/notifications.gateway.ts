import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.emit('auth:error', { message: 'Missing token', code: 'MISSING_TOKEN' });
        setTimeout(() => client.disconnect(), 1000);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.userId;

      this.logger.log(`Notification client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error('Notification WebSocket authentication failed:', error.message);

      const errorCode = error.message.includes('jwt expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      client.emit('auth:error', {
        message: error.message,
        code: errorCode
      });

      setTimeout(() => client.disconnect(), 1000);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

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

    this.notificationsService.publish(payload);
    this.server.emit('notification', payload);
    this.logger.log('广播通知:', payload.title);
  }

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

    this.notificationsService.publish(payload);
    this.server.to(`user_${userId}`).emit('notification', payload);
    this.logger.log(`发送给用户 ${userId} 的通知:`, payload.title);
  }
}