import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { RawDataSourceService } from '@pro/mongodb';
import { RabbitMQClient } from '@pro/rabbitmq';
import { RawDataReadyEvent, SourcePlatform, SourceType } from '@pro/types';
import { RabbitConfig } from '../config/crawler.config';

export interface StorePayload {
  type: SourceType;
  platform: SourcePlatform;
  url: string;
  raw: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class StorageService implements OnModuleDestroy {
  private client: RabbitMQClient | null = null;

  constructor(
    private readonly rawData: RawDataSourceService,
    @Inject('RABBIT_CONFIG') private readonly config: RabbitConfig,
  ) {}

  async store(payload: StorePayload): Promise<boolean> {
    const metadata = payload.metadata ? { ...payload.metadata } : {};
    const created = await this.rawData.create({
      sourceType: payload.type,
      sourceUrl: payload.url,
      rawContent: payload.raw,
      metadata,
    });

    if (!created) {
      return false;
    }

    await this.ensureClient();
    await this.client!.publish(this.config.queues.rawDataReady, this.buildEvent(payload, metadata, created.id, created.contentHash));
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.close();
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.client) {
      this.client = new RabbitMQClient({
        url: this.config.url,
        queue: this.config.queues.rawDataReady,
      });
      await this.client.connect();
    }
  }

  private buildEvent(
    payload: StorePayload,
    metadata: Record<string, unknown>,
    id: string,
    contentHash: string,
  ): RawDataReadyEvent {
    return {
      rawDataId: id,
      sourceType: payload.type,
      sourcePlatform: payload.platform,
      sourceUrl: payload.url,
      contentHash,
      metadata: {
        taskId: metadata.taskId as number | undefined,
        keyword: metadata.keyword as string | undefined,
        timeRange: metadata.timeRange as { start: string; end: string } | undefined,
        fileSize: Buffer.byteLength(payload.raw),
      },
      createdAt: new Date().toISOString(),
    };
  }
}
