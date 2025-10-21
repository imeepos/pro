import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggedInUsersStats } from '@pro/types';
import { WeiboAccountService } from '../weibo/weibo-account.service';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { SUBSCRIPTION_EVENTS } from './constants/subscription-events';
import { ConnectionGatekeeper, ConnectionRateLimitException } from '../auth/services/connection-gatekeeper.service';

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
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8, // 100 MB
})
export class ScreensGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ScreensGateway.name);
  private readonly connectedClients = new Map<string, {
    socket: Socket;
    userId: string;
    connectedAt: Date;
    lastPing: Date;
    ip: string;
    heartbeatTimer?: NodeJS.Timeout;
    releaseLease?: () => void;
  }>();
  private readonly heartbeatInterval = 30000; // 30秒心跳间隔
  private readonly connectionTimeout = 120000; // 2分钟连接超时

  constructor(
    private readonly jwtService: JwtService,
    private readonly pubSub: PubSubService,
    private readonly connectionGatekeeper: ConnectionGatekeeper,
    @Inject(forwardRef(() => WeiboAccountService))
    private readonly weiboAccountService: WeiboAccountService,
  ) {}

  async onModuleInit() {
    // 启动时广播首帧数据
    await this.broadcastInitialStats();
    // 启动连接健康检查
    this.startConnectionHealthCheck();
  }

  afterInit(server: Server) {
    this.logger.log('Screens WebSocket Gateway initialized with enhanced stability features');
    this.logger.debug(`Gateway configuration: pingTimeout=60s, pingInterval=25s, heartbeatInterval=30s`);
  }

  /**
   * WebSocket 连接时的 JWT 认证
   * token 通过握手时的 auth.token 传递
   */
  async handleConnection(client: Socket) {
    const connectionStartTime = Date.now();
    const clientIp = this.resolveClientIp(client);
    let releaseLease: (() => void) | null = null;

    try {
      this.connectionGatekeeper.assertHandshakeAllowed(clientIp, 'screens');

      const token = client.handshake.auth.token;

      if (!token) {
        this.logger.warn(`Connection rejected: missing token, client: ${client.id}`);
        this.connectionGatekeeper.recordHandshakeFailure(clientIp, 'screens');
        client.emit('auth:error', { message: 'Missing token', code: 'MISSING_TOKEN' });
        client.emit('connection:rejected', { reason: 'missing_token', code: 'MISSING_TOKEN', timestamp: new Date().toISOString() });
        setTimeout(() => {
          if (client.connected) {
            client.disconnect(true);
          }
        }, 2000);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.userId;

      releaseLease = this.connectionGatekeeper.openLease(client.id, {
        ip: clientIp,
        userId,
        namespace: 'screens',
      });

      client.data.userId = userId;
      const connectedAt = new Date();
      client.data.connectedAt = connectedAt;
      client.data.lastPing = connectedAt;
      client.data.ip = clientIp;

      this.registerClient(client, userId, clientIp ?? 'unknown', releaseLease, connectedAt);
      this.setupClientEventHandlers(client);
      this.setupHeartbeat(client);

      const connectionDuration = Date.now() - connectionStartTime;
      this.logger.log(`Client connected successfully: ${client.id}, userId: ${userId}, ip=${clientIp ?? 'unknown'}, duration=${connectionDuration}ms`);

      client.emit('connection:established', {
        clientId: client.id,
        userId,
        connectedAt: client.data.connectedAt,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      if (releaseLease) {
        releaseLease();
        releaseLease = null;
      }

      const connectionDuration = Date.now() - connectionStartTime;
      const errorMessage = error?.message || 'Authentication failed';
      const isRateLimited = error instanceof ConnectionRateLimitException;

      if (isRateLimited) {
        this.logger.warn(`WebSocket connection throttled: client=${client.id}, ip=${clientIp ?? 'unknown'}, duration=${connectionDuration}ms`);
        client.emit('connection:rejected', {
          reason: 'rate_limited',
          code: 'RATE_LIMITED',
          timestamp: new Date().toISOString(),
        });
        if (client.connected) {
          client.disconnect(true);
        }
        return;
      }

      this.connectionGatekeeper.recordHandshakeFailure(clientIp, 'screens');
      this.logger.error(
        `WebSocket authentication failed: client=${client.id}, duration=${connectionDuration}ms, error=${errorMessage}`,
        error.stack,
      );

      const errorCode = errorMessage.includes('jwt expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      client.emit('auth:error', {
        message: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
      });
      client.emit('connection:rejected', {
        reason: 'auth_failed',
        code: errorCode,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        if (client.connected) {
          client.disconnect(true);
        }
      }, 2000);
    }
  }

  handleDisconnect(client: Socket) {
    this.unregisterClient(client);

    const userId = client.data.userId;
    const connectedAt = client.data.connectedAt;
    const duration = connectedAt ? Date.now() - connectedAt.getTime() : 0;

    this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}, duration: ${duration}ms`);
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

  /**
   * 启动连接健康检查
   */
  private startConnectionHealthCheck() {
    setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      this.connectedClients.forEach((client, clientId) => {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        if (timeSinceLastPing > this.connectionTimeout) {
          staleConnections.push(clientId);
        }
      });

      staleConnections.forEach(clientId => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          this.logger.warn(`断开不活跃的客户端: ${clientId}`);
          client.socket.disconnect(true);
        }
      });
    }, this.heartbeatInterval);
  }

  /**
   * 注册客户端连接
   */
  private registerClient(
    client: Socket,
    userId: string,
    ip: string,
    releaseLease: (() => void) | undefined,
    connectedAt: Date,
  ) {
    this.connectedClients.set(client.id, {
      socket: client,
      userId,
      connectedAt,
      lastPing: connectedAt,
      ip,
      releaseLease,
    });
  }

  /**
   * 注销客户端连接
   */
  private unregisterClient(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      if (clientInfo.heartbeatTimer) {
        clearInterval(clientInfo.heartbeatTimer);
      }

      clientInfo.releaseLease?.();
      clientInfo.releaseLease = undefined;

      client.leave(`user_${clientInfo.userId}`);

      this.connectedClients.delete(client.id);
      this.logger.debug(`Client unregistered: ${client.id}, remaining clients: ${this.connectedClients.size}`);
    }
  }

  /**
   * 设置客户端事件处理器
   */
  private setupClientEventHandlers(client: Socket) {
    // 心跳响应
    client.on('ping', () => {
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.lastPing = new Date();
        this.connectionGatekeeper.markHeartbeat(client.id);
        client.emit('pong');
      }
    });

    // 自定义心跳
    client.on('heartbeat', () => {
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.lastPing = new Date();
        this.connectionGatekeeper.markHeartbeat(client.id);
        client.emit('heartbeat:ack', { timestamp: new Date().toISOString() });
      }
    });

    // 连接状态查询
    client.on('connection:status', (callback) => {
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo && typeof callback === 'function') {
        callback({
          status: 'connected',
          clientId: client.id,
          userId: clientInfo.userId,
          connectedAt: clientInfo.connectedAt,
          lastPing: clientInfo.lastPing,
          serverTime: new Date().toISOString()
        });
      }
    });

    // 微博扫码登录订阅
    client.on('weibo:login:subscribe', (data, callback) => {
      this.logger.debug(`Client ${client.id} subscribed to weibo login events`);
      if (typeof callback === 'function') {
        callback({ success: true, message: 'Subscribed to weibo login events' });
      }
    });

    // 错误处理
    client.on('error', (error) => {
      this.logger.error(`Client error: ${client.id}`, error);
      this.unregisterClient(client);
    });
  }

  /**
   * 设置心跳定时器
   */
  private setupHeartbeat(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    clientInfo.heartbeatTimer = setInterval(() => {
      if (client.connected) {
        client.emit('heartbeat', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(clientInfo.heartbeatTimer);
        clientInfo.releaseLease?.();
        clientInfo.releaseLease = undefined;
        this.connectedClients.delete(client.id);
      }
    }, this.heartbeatInterval);
  }

  private resolveClientIp(client: Socket): string | undefined {
    const forwarded = client.handshake?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }

    const address = client.handshake?.address ?? client.conn.remoteAddress;
    return address ?? undefined;
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalConnections: number;
    connectionsByUser: Array<{ userId: string; count: number }>;
    averageConnectionDuration: number;
  } {
    const now = Date.now();
    const connectionsByUser = new Map<string, number>();
    let totalDuration = 0;
    let validDurations = 0;

    this.connectedClients.forEach(clientInfo => {
      // 按用户统计连接数
      const count = connectionsByUser.get(clientInfo.userId) || 0;
      connectionsByUser.set(clientInfo.userId, count + 1);

      // 计算连接持续时间
      const duration = now - clientInfo.connectedAt.getTime();
      totalDuration += duration;
      validDurations++;
    });

    return {
      totalConnections: this.connectedClients.size,
      connectionsByUser: Array.from(connectionsByUser.entries()).map(([userId, count]) => ({ userId, count })),
      averageConnectionDuration: validDurations > 0 ? Math.round(totalDuration / validDurations) : 0
    };
  }

  /**
   * 向特定用户发送消息
   */
  sendToUser(userId: string, event: string, data: any): boolean {
    const success = this.server.to(`user_${userId}`).emit(event, data);
    if (success) {
      this.logger.debug(`Message sent to user ${userId}: ${event}`);
    } else {
      this.logger.warn(`Failed to send message to user ${userId}: ${event}`);
    }
    return success;
  }

  /**
   * 获取用户连接信息
   */
  getUserConnections(userId: string): Array<{
    clientId: string;
    connectedAt: Date;
    lastPing: Date;
  }> {
    const connections: Array<{
      clientId: string;
      connectedAt: Date;
      lastPing: Date;
    }> = [];

    this.connectedClients.forEach((clientInfo, clientId) => {
      if (clientInfo.userId === userId) {
        connections.push({
          clientId,
          connectedAt: clientInfo.connectedAt,
          lastPing: clientInfo.lastPing
        });
      }
    });

    return connections;
  }
}
