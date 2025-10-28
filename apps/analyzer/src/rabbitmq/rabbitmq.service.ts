import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { PinoLogger } from '@pro/logger-nestjs';

export interface CleanedDataEvent {
  taskId: number;
  dataId: number;
  dataType: 'post' | 'comment' | 'user';
  content: string;
  platform?: string;
  metadata?: Record<string, any>;
}

export interface AnalysisResultEvent {
  taskId: number;
  dataId: number;
  dataType: 'post' | 'comment' | 'user';
  analysisId: number;
  sentimentLabel?: string;
  keywords?: string[];
  timestamp: Date;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;
  private readonly cleanedDataQueue: string;
  private readonly analysisResultQueue: string;
  private connectionReady: Promise<void>;
  private resolveConnection: () => void;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.cleanedDataQueue = this.configService.get<string>(
      'CLEANED_DATA_QUEUE',
      'cleaned_data_queue',
    );
    this.analysisResultQueue = this.configService.get<string>(
      'ANALYSIS_RESULT_QUEUE',
      'analysis_result_queue',
    );
    this.connectionReady = new Promise((resolve) => {
      this.resolveConnection = resolve;
    });
  }

  async onModuleInit(): Promise<void> {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

    const config: RabbitMQConfig = {
      url: rabbitmqUrl,
      queue: this.cleanedDataQueue,
    };

    this.logger.debug('初始化 RabbitMQ 连接', {
      url: rabbitmqUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      consumeQueue: this.cleanedDataQueue,
      publishQueue: this.analysisResultQueue,
    });

    const connectStart = Date.now();
    this.client = new RabbitMQClient(config);

    try {
      await this.client.connect();
      const connectDuration = Date.now() - connectStart;

      this.logger.info(`RabbitMQ 连接已建立，耗时 ${connectDuration}ms`, 'RabbitMQService');
      this.logger.debug('RabbitMQ 连接详情', {
        consumeQueue: this.cleanedDataQueue,
        publishQueue: this.analysisResultQueue,
        connectionTimeMs: connectDuration,
      });

      this.resolveConnection();
    } catch (error) {
      const connectDuration = Date.now() - connectStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('RabbitMQ 连接失败', {
        error: errorMessage,
        connectionTimeMs: connectDuration,
      });
      throw error;
    }
  }

  async waitForConnection(): Promise<void> {
    return this.connectionReady;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('开始关闭 RabbitMQ 连接');
    const closeStart = Date.now();

    try {
      await this.client.close();
      const closeDuration = Date.now() - closeStart;
      this.logger.info(`RabbitMQ 连接已关闭，耗时 ${closeDuration}ms`, 'RabbitMQService');
    } catch (error) {
      const closeDuration = Date.now() - closeStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('关闭 RabbitMQ 连接时发生错误', {
        error: errorMessage,
        closeTimeMs: closeDuration,
      });
    }
  }

  async publishAnalysisResult(event: AnalysisResultEvent): Promise<boolean> {
    const publishStart = Date.now();
    const messageSize = JSON.stringify(event).length;

    this.logger.debug('发布分析结果', {
      taskId: event.taskId,
      dataId: event.dataId,
      dataType: event.dataType,
      queue: this.analysisResultQueue,
      messageSizeBytes: messageSize,
    });

    try {
      const success = await this.client.publish(this.analysisResultQueue, event);
      const publishDuration = Date.now() - publishStart;

      if (success) {
        this.logger.info(
          `已发布分析结果: 任务ID=${event.taskId}, 数据ID=${event.dataId}, 类型=${event.dataType}, 耗时 ${publishDuration}ms`,
          'RabbitMQService',
        );
      } else {
        this.logger.warn(`发布分析结果失败: 任务ID=${event.taskId}`, 'RabbitMQService');
      }

      return success;
    } catch (error) {
      const publishDuration = Date.now() - publishStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('发布分析结果失败', {
        taskId: event.taskId,
        dataId: event.dataId,
        queue: this.analysisResultQueue,
        error: errorMessage,
        publishTimeMs: publishDuration,
      });
      throw error;
    }
  }

  getClient(): RabbitMQClient {
    return this.client;
  }

  getCleanedDataQueue(): string {
    return this.cleanedDataQueue;
  }
}
