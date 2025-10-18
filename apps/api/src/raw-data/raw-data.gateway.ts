import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawDataSource } from '@pro/mongodb';
import { RawDataService } from './raw-data.service';
import {
  RealtimeEventType,
  BaseRealtimeEvent,
  StatisticsUpdatedPayload,
  DataCreatedPayload,
  DataStatusChangedPayload,
  DataBatchUpdatedPayload,
  ConnectionStatusPayload,
  ErrorOccurredPayload,
  WebSocketMessage,
  SubscriptionOptions,
  ConnectionAuth,
  RealtimeEventFactory
} from './interfaces/realtime-update.interface';
import { ProcessingStatus, SourceType } from './dto/raw-data.dto';

/**
 * 原始数据实时更新 WebSocket Gateway
 *
 * 此网关提供原始数据的实时推送功能，包括：
 * - 数据统计实时更新
 * - 新数据创建通知
 * - 处理状态变化通知
 * - 系统错误推送
 * - 客户端连接管理
 *
 * 设计原则：
 * - 优雅的错误处理
 * - 高效的并发处理
 * - 智能的消息批处理
 * - 灵活的订阅机制
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  namespace: '/raw-data',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})
export class RawDataGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RawDataGateway.name);

  // 活跃连接映射：userId -> Set<socketId>
  private readonly userConnections = new Map<string, Set<string>>();

  // 连接订阅配置：socketId -> SubscriptionOptions
  private readonly connectionSubscriptions = new Map<string, SubscriptionOptions>();

  // 消息批处理器：用于合并频繁的更新
  private readonly batchProcessors = new Map<RealtimeEventType, NodeJS.Timeout>();

  // 待发送的消息队列
  private readonly messageQueues = new Map<RealtimeEventType, BaseRealtimeEvent[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly rawDataService: RawDataService,
    @InjectModel(RawDataSource.name)
    private readonly rawDataModel: Model<RawDataSource>
  ) {}

  /**
   * Gateway 初始化完成后的回调
   */
  afterInit(server: Server) {
    this.logger.log('RawData WebSocket Gateway initialized successfully');

    // 设置定期统计更新
    this.setupStatisticsUpdater();

    // 设置系统健康检查
    this.setupHealthChecker();
  }

  /**
   * 处理新的WebSocket连接
   */
  async handleConnection(client: Socket) {
    this.logger.log(`New connection attempt: ${client.id}`);

    try {
      // 验证认证信息
      const auth = await this.authenticateClient(client);

      // 记录用户连接
      this.registerUserConnection(auth, client.id);

      // 设置默认订阅
      this.setDefaultSubscription(client.id, auth.subscription);

      // 发送连接成功状态
      this.sendConnectionStatus(client, 'connected', 'Connection established successfully');

      // 立即发送当前统计数据
      await this.sendCurrentStatistics(client);

      this.logger.log(`Client connected successfully: ${client.id}, userId: ${auth.userId}`);
    } catch (error) {
      this.logger.error(`Connection failed for ${client.id}: ${error.message}`, error.stack);

      this.sendConnectionStatus(client, 'error', 'Authentication failed', {
        code: 'AUTH_ERROR',
        message: error.message
      });

      // 延迟断开连接，确保客户端收到错误消息
      setTimeout(() => client.disconnect(true), 1000);
    }
  }

  /**
   * 处理连接断开
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 清理连接记录
    this.unregisterUserConnection(client.id);

    // 清理订阅配置
    this.connectionSubscriptions.delete(client.id);

    // 发送断开状态通知（如果可能）
    try {
      this.sendConnectionStatus(client, 'disconnected', 'Connection closed');
    } catch (error) {
      // 连接已断开，忽略错误
    }
  }

  /**
   * 订阅特定事件类型
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { eventTypes: RealtimeEventType[]; options?: Partial<SubscriptionOptions> },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const subscription: SubscriptionOptions = {
        eventTypes: data.eventTypes,
        sourceTypes: data.options?.sourceTypes,
        statuses: data.options?.statuses,
        throttleMs: data.options?.throttleMs || 1000,
        batchSize: data.options?.batchSize || 10
      };

      this.connectionSubscriptions.set(client.id, subscription);

      client.emit('subscribed', {
        eventTypes: data.eventTypes,
        message: 'Subscription updated successfully'
      });

      this.logger.log(`Client ${client.id} subscribed to events: ${data.eventTypes.join(', ')}`);
    } catch (error) {
      this.logger.error(`Subscribe failed for ${client.id}: ${error.message}`);
      client.emit('error', { message: 'Failed to update subscription' });
    }
  }

  /**
   * 获取当前统计数据
   */
  @SubscribeMessage('get-statistics')
  async handleGetStatistics(@ConnectedSocket() client: Socket) {
    try {
      const statistics = await this.rawDataService.getStatistics();
      client.emit('statistics', statistics);
    } catch (error) {
      this.logger.error(`Failed to get statistics for ${client.id}: ${error.message}`);
      client.emit('error', { message: 'Failed to retrieve statistics' });
    }
  }

  /**
   * 广播统计更新
   */
  broadcastStatisticsUpdate(previousStats?: any, currentStats?: any) {
    if (!currentStats) return;

    const payload: StatisticsUpdatedPayload = {
      pending: currentStats.pending,
      processing: currentStats.processing,
      completed: currentStats.completed,
      failed: currentStats.failed,
      total: currentStats.total,
      successRate: currentStats.successRate,
      changes: previousStats ? {
        pending: currentStats.pending - previousStats.pending,
        processing: currentStats.processing - previousStats.processing,
        completed: currentStats.completed - previousStats.completed,
        failed: currentStats.failed - previousStats.failed,
        total: currentStats.total - previousStats.total
      } : undefined
    };

    this.broadcastEvent(
      RealtimeEventType.STATISTICS_UPDATED,
      payload,
      { source: 'statistics_update', hasChanges: !!previousStats }
    );
  }

  /**
   * 广播新数据创建
   */
  broadcastDataCreated(dataId: string, sourceType: SourceType, sourceUrl: string, contentPreview: string, status: ProcessingStatus) {
    const payload: DataCreatedPayload = {
      id: dataId,
      sourceType,
      sourceUrl,
      contentPreview,
      status,
      createdAt: new Date()
    };

    this.broadcastEvent(
      RealtimeEventType.DATA_CREATED,
      payload,
      { source: 'data_creation', sourceType }
    );
  }

  /**
   * 广播数据状态变化
   */
  broadcastDataStatusChanged(dataId: string, previousStatus: ProcessingStatus, currentStatus: ProcessingStatus, processingDuration?: number, errorMessage?: string) {
    const payload: DataStatusChangedPayload = {
      id: dataId,
      previousStatus,
      currentStatus,
      changedAt: new Date(),
      processingDuration,
      errorMessage
    };

    this.broadcastEvent(
      RealtimeEventType.DATA_STATUS_CHANGED,
      payload,
      {
        source: 'status_change',
        statusTransition: `${previousStatus}->${currentStatus}`,
        hasError: !!errorMessage
      }
    );
  }

  /**
   * 广播批量数据更新
   */
  broadcastDataBatchUpdated(dataIds: string[], updateType: 'status_change' | 'bulk_creation' | 'bulk_deletion', statistics: any) {
    const payload: DataBatchUpdatedPayload = {
      dataIds,
      updateType,
      statistics: {
        total: dataIds.length,
        byStatus: statistics.byStatus || {},
        bySourceType: statistics.bySourceType || {}
      },
      timeRange: {
        start: new Date(Date.now() - 60000), // 最近1分钟
        end: new Date()
      }
    };

    this.broadcastEvent(
      RealtimeEventType.DATA_BATCH_UPDATED,
      payload,
      { source: 'batch_update', updateType, count: dataIds.length }
    );
  }

  /**
   * 广播系统错误
   */
  broadcastError(errorCode: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', relatedDataId?: string, details?: any) {
    const payload: ErrorOccurredPayload = {
      code: errorCode,
      message,
      severity,
      occurredAt: new Date(),
      relatedDataId,
      details,
      solution: this.getErrorSolution(errorCode)
    };

    this.broadcastEvent(
      RealtimeEventType.ERROR_OCCURRED,
      payload,
      { source: 'error_broadcast', severity }
    );
  }

  /**
   * 认证客户端连接
   */
  private async authenticateClient(client: Socket): Promise<ConnectionAuth & { userId: string }> {
    const token = client.handshake.auth?.token;

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (!payload.userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        token,
        userId: payload.userId,
        clientId: client.handshake.auth?.clientId || client.id,
        purpose: client.handshake.auth?.purpose || 'realtime_updates',
        subscription: client.handshake.auth?.subscription
      };
    } catch (error) {
      throw new UnauthorizedException(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * 注册用户连接
   */
  private registerUserConnection(auth: { userId: string }, socketId: string) {
    if (!this.userConnections.has(auth.userId)) {
      this.userConnections.set(auth.userId, new Set());
    }
    this.userConnections.get(auth.userId)!.add(socketId);
  }

  /**
   * 取消注册用户连接
   */
  private unregisterUserConnection(socketId: string) {
    for (const [userId, connections] of this.userConnections.entries()) {
      if (connections.has(socketId)) {
        connections.delete(socketId);
        if (connections.size === 0) {
          this.userConnections.delete(userId);
        }
        break;
      }
    }
  }

  /**
   * 设置默认订阅
   */
  private setDefaultSubscription(socketId: string, subscription?: Partial<SubscriptionOptions>) {
    const defaultSubscription: SubscriptionOptions = {
      eventTypes: [
        RealtimeEventType.STATISTICS_UPDATED,
        RealtimeEventType.DATA_CREATED,
        RealtimeEventType.DATA_STATUS_CHANGED,
        RealtimeEventType.ERROR_OCCURRED
      ],
      throttleMs: 1000,
      batchSize: 10,
      ...subscription
    };

    this.connectionSubscriptions.set(socketId, defaultSubscription);
  }

  /**
   * 发送连接状态
   */
  private sendConnectionStatus(client: Socket, status: ConnectionStatusPayload['status'], message: string, error?: { code: string; message: string }) {
    const payload: ConnectionStatusPayload = {
      status,
      message,
      clientId: client.id,
      connectedAt: status === 'connected' ? new Date() : undefined,
      error
    };

    client.emit('connection:status', payload);
  }

  /**
   * 发送当前统计数据
   */
  private async sendCurrentStatistics(client: Socket) {
    try {
      const statistics = await this.rawDataService.getStatistics();
      const event = RealtimeEventFactory.createStatisticsUpdatedEvent(statistics);
      this.sendEventToClient(client, event);
    } catch (error) {
      this.logger.error(`Failed to send current statistics to ${client.id}: ${error.message}`);
    }
  }

  /**
   * 广播事件到所有订阅的客户端
   */
  private broadcastEvent(eventType: RealtimeEventType, payload: any, metadata?: Record<string, any>) {
    const event = RealtimeEventFactory.createStatisticsUpdatedEvent(payload, metadata);

    // 检查是否需要批处理
    if (this.shouldBatchEvent(eventType)) {
      this.addToBatch(eventType, event);
    } else {
      this.sendEventToAll(event);
    }
  }

  /**
   * 发送事件到特定客户端
   */
  private sendEventToClient(client: Socket, event: BaseRealtimeEvent) {
    const subscription = this.connectionSubscriptions.get(client.id);

    if (!subscription || !subscription.eventTypes.includes(event.type)) {
      return;
    }

    const message: WebSocketMessage = {
      type: event.type,
      data: event.payload,
      timestamp: event.timestamp,
      messageId: event.eventId,
      metadata: event.metadata
    };

    client.emit(event.type, message);
  }

  /**
   * 发送事件到所有订阅的客户端
   */
  private sendEventToAll(event: BaseRealtimeEvent) {
    this.server.sockets.sockets.forEach((client) => {
      if (client.connected) {
        this.sendEventToClient(client, event);
      }
    });
  }

  /**
   * 判断事件是否需要批处理
   */
  private shouldBatchEvent(eventType: RealtimeEventType): boolean {
    return eventType === RealtimeEventType.DATA_STATUS_CHANGED ||
           eventType === RealtimeEventType.STATISTICS_UPDATED;
  }

  /**
   * 添加事件到批处理队列
   */
  private addToBatch(eventType: RealtimeEventType, event: BaseRealtimeEvent) {
    if (!this.messageQueues.has(eventType)) {
      this.messageQueues.set(eventType, []);
    }

    const queue = this.messageQueues.get(eventType)!;
    queue.push(event);

    // 如果队列达到批处理大小，立即处理
    const subscription = this.getDefaultSubscription();
    if (queue.length >= subscription.batchSize) {
      this.processBatch(eventType);
    } else {
      // 设置延迟处理
      this.scheduleBatchProcessing(eventType, subscription.throttleMs);
    }
  }

  /**
   * 调度批处理
   */
  private scheduleBatchProcessing(eventType: RealtimeEventType, delayMs: number) {
    if (this.batchProcessors.has(eventType)) {
      return; // 已经调度了批处理
    }

    const timeout = setTimeout(() => {
      this.processBatch(eventType);
    }, delayMs);

    this.batchProcessors.set(eventType, timeout);
  }

  /**
   * 处理批次事件
   */
  private processBatch(eventType: RealtimeEventType) {
    const queue = this.messageQueues.get(eventType);
    if (!queue || queue.length === 0) {
      return;
    }

    // 清理调度器
    const timeout = this.batchProcessors.get(eventType);
    if (timeout) {
      clearTimeout(timeout);
      this.batchProcessors.delete(eventType);
    }

    // 获取批处理事件
    const events = queue.splice(0, Math.min(queue.length, this.getDefaultSubscription().batchSize));

    if (events.length === 1) {
      // 单个事件直接发送
      this.sendEventToAll(events[0]);
    } else {
      // 合并多个事件
      const mergedEvent = this.mergeEvents(eventType, events);
      this.sendEventToAll(mergedEvent);
    }

    // 如果还有剩余事件，继续调度处理
    if (queue.length > 0) {
      this.scheduleBatchProcessing(eventType, this.getDefaultSubscription().throttleMs);
    }
  }

  /**
   * 合并多个同类型事件
   */
  private mergeEvents(eventType: RealtimeEventType, events: BaseRealtimeEvent[]): BaseRealtimeEvent {
    if (eventType === RealtimeEventType.DATA_STATUS_CHANGED) {
      // 合并状态变化事件：只保留最新状态
      const latestEvent = events[events.length - 1];
      return latestEvent;
    }

    if (eventType === RealtimeEventType.STATISTICS_UPDATED) {
      // 合并统计事件：使用最新的统计数据
      const latestEvent = events[events.length - 1];
      return latestEvent;
    }

    // 其他类型默认返回最后一个事件
    return events[events.length - 1];
  }

  /**
   * 获取默认订阅配置
   */
  private getDefaultSubscription(): SubscriptionOptions {
    return {
      eventTypes: Object.values(RealtimeEventType),
      throttleMs: 1000,
      batchSize: 10
    };
  }

  /**
   * 获取错误解决方案
   */
  private getErrorSolution(errorCode: string): string | undefined {
    const solutions: Record<string, string> = {
      'DATABASE_CONNECTION_ERROR': '请检查数据库连接配置，确保数据库服务正常运行',
      'DATA_VALIDATION_ERROR': '请检查输入数据格式，确保符合验证规则',
      'PROCESSING_TIMEOUT': '数据处理超时，请尝试减少数据量或优化处理逻辑',
      'AUTHENTICATION_ERROR': '请重新登录获取有效令牌',
      'RATE_LIMIT_EXCEEDED': '请求频率过高，请稍后重试'
    };

    return solutions[errorCode];
  }

  /**
   * 设置定期统计更新
   */
  private setupStatisticsUpdater() {
    const updateInterval = 5000; // 5秒更新一次

    setInterval(async () => {
      try {
        const statistics = await this.rawDataService.getStatistics();
        this.broadcastStatisticsUpdate(undefined, statistics);
      } catch (error) {
        this.logger.error(`Failed to update statistics: ${error.message}`);
        this.broadcastError('STATISTICS_UPDATE_ERROR', 'Failed to update statistics', 'low');
      }
    }, updateInterval);
  }

  /**
   * 设置系统健康检查
   */
  private setupHealthChecker() {
    const healthCheckInterval = 30000; // 30秒检查一次

    setInterval(async () => {
      try {
        // 检查数据库连接
        await this.rawDataModel.findOne().limit(1).exec();
      } catch (error) {
        this.logger.error(`Health check failed: ${error.message}`);
        this.broadcastError('SYSTEM_HEALTH_CHECK_FAILED', 'System health check failed', 'high');
      }
    }, healthCheckInterval);
  }
}