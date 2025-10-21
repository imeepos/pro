import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis, { Cluster } from 'ioredis';
import { buildPubSubConfig, PubSubModuleConfig, PubSubRedisConfig } from './pubsub.config';

interface ChannelMetadata {
  trigger: string;
  description?: string;
  requiredScopes?: string[];
  publishScopes?: string[];
  allowAnonymous?: boolean;
}

type PubSubLike = {
  publish(triggerName: string, payload: unknown): Promise<void>;
  subscribe(triggerName: string, onMessage: (...args: unknown[]) => void, options?: object): Promise<number>;
  unsubscribe(subId: number): void;
  asyncIterableIterator<T>(triggers: string | readonly string[]): AsyncIterator<T>;
  asyncIterator?<T>(triggers: string | string[]): AsyncIterator<T>;
};

@Injectable()
export class PubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(PubSubService.name);
  private readonly engine: PubSubLike;
  private readonly namespace: string;
  private readonly driver: PubSubModuleConfig['driver'];
  private readonly teardownCallbacks: Array<() => Promise<void>> = [];
  private readonly channelRegistry = new Map<string, ChannelMetadata>();

  constructor(private readonly configService: ConfigService) {
    const config = buildPubSubConfig(this.configService);
    this.namespace = config.namespace;
    this.driver = config.driver;
    this.engine = this.bootstrapEngine(config);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.teardownCallbacks.map(callback => callback()));
  }

  publish<T>(triggerName: string, payload: T, metadata?: Omit<ChannelMetadata, 'trigger'>): Promise<void> {
    if (metadata) {
      this.registerChannel(triggerName, metadata);
    }

    return this.engine.publish(this.qualifyTrigger(triggerName), payload);
  }

  subscribe(triggerName: string, onMessage: (...args: unknown[]) => void): Promise<number> {
    return this.engine.subscribe(this.qualifyTrigger(triggerName), onMessage);
  }

  unsubscribe(subId: number): void {
    this.engine.unsubscribe(subId);
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    const qualified = Array.isArray(triggers)
      ? triggers.map(trigger => this.qualifyTrigger(trigger))
      : this.qualifyTrigger(triggers);

    if (this.engine.asyncIterator) {
      return this.engine.asyncIterator<T>(qualified);
    }

    const normalized = Array.isArray(qualified) ? qualified : [qualified];
    return this.engine.asyncIterableIterator<T>(normalized);
  }

  registerChannel(trigger: string, metadata: Omit<ChannelMetadata, 'trigger'> = {}): void {
    const qualified = this.qualifyTrigger(trigger);
    const current = this.channelRegistry.get(qualified);
    this.channelRegistry.set(qualified, {
      trigger: qualified,
      ...(current ?? {}),
      ...metadata,
      requiredScopes: metadata.requiredScopes ?? current?.requiredScopes,
      publishScopes: metadata.publishScopes ?? current?.publishScopes,
      allowAnonymous: metadata.allowAnonymous ?? current?.allowAnonymous ?? false,
    });
  }

  getChannelMetadata(trigger: string): ChannelMetadata | undefined {
    const qualified = this.qualifyTrigger(trigger);
    return this.channelRegistry.get(qualified);
  }

  getDriver(): PubSubModuleConfig['driver'] {
    return this.driver;
  }

  private bootstrapEngine(config: PubSubModuleConfig): PubSubLike {
    if (config.driver !== 'redis' || !config.redis) {
      this.logger.log('PubSub operating in in-memory mode');
      return new PubSub() as unknown as PubSubLike;
    }

    const engine = this.createRedisPubSub(config.redis);
    this.logger.log(`PubSub connected via Redis (${config.redis.mode}) namespace=${this.namespace}`);
    return engine;
  }

  private createRedisPubSub(config: PubSubRedisConfig): PubSubLike {
    if (config.mode === 'cluster') {
      const createCluster = () => new Redis.Cluster(config.nodes, config.options);
      const publisher = createCluster();
      const subscriber = createCluster();

      this.attachLifecycleLogging(publisher, 'cluster-publisher');
      this.attachLifecycleLogging(subscriber, 'cluster-subscriber');

      this.teardownCallbacks.push(async () => {
        await Promise.allSettled([publisher.quit(), subscriber.quit()]);
      });

      return new RedisPubSub({ publisher, subscriber }) as unknown as PubSubLike;
    }

    const createClient = () => (typeof config.options === 'string' ? new Redis(config.options) : new Redis(config.options));
    const publisher = createClient();
    const subscriber = createClient();

    this.attachLifecycleLogging(publisher, 'publisher');
    this.attachLifecycleLogging(subscriber, 'subscriber');

    this.teardownCallbacks.push(async () => {
      await Promise.allSettled([publisher.quit(), subscriber.quit()]);
    });

    return new RedisPubSub({ publisher, subscriber }) as unknown as PubSubLike;
  }

  private attachLifecycleLogging(connection: Redis | Cluster, role: string) {
    connection.on('connect', () => {
      this.logger.log(`Redis ${role} connected`);
    });

    connection.on('error', (error) => {
      this.logger.error(`Redis ${role} error: ${error.message}`, error.stack);
    });

    connection.on('close', () => {
      this.logger.warn(`Redis ${role} connection closed`);
    });
  }

  private qualifyTrigger(triggerName: string): string {
    if (triggerName.startsWith(`${this.namespace}:`)) {
      return triggerName;
    }

    return `${this.namespace}:${triggerName}`;
  }
}
