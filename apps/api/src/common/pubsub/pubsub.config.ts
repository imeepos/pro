import { ConfigService } from '@nestjs/config';
import { ClusterNode, ClusterOptions, RedisOptions } from 'ioredis';

export type PubSubDriver = 'memory' | 'redis';
export type PubSubRedisMode = 'standalone' | 'cluster';

export interface PubSubStandaloneRedisConfig {
  mode: 'standalone';
  options: RedisOptions | string;
}

export interface PubSubClusterRedisConfig {
  mode: 'cluster';
  nodes: ClusterNode[];
  options: ClusterOptions;
}

export type PubSubRedisConfig = PubSubStandaloneRedisConfig | PubSubClusterRedisConfig;

export interface PubSubModuleConfig {
  driver: PubSubDriver;
  namespace: string;
  redis?: PubSubRedisConfig;
}

const parseClusterNodes = (rawNodes: string): ClusterNode[] => {
  return rawNodes
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)
    .map(token => {
      const [host, port] = token.split(':');
      return {
        host,
        port: port ? Number.parseInt(port, 10) : 6379,
      } satisfies ClusterNode;
    });
};

export const buildPubSubConfig = (configService: ConfigService): PubSubModuleConfig => {
  const driver = (configService.get<string>('PUBSUB_DRIVER', 'memory') ?? 'memory').toLowerCase() as PubSubDriver;
  const namespace = configService.get<string>('PUBSUB_NAMESPACE', '@pro/api');

  if (driver !== 'redis') {
    return { driver: 'memory', namespace } satisfies PubSubModuleConfig;
  }

  const redisMode = (configService.get<string>('PUBSUB_REDIS_MODE', 'standalone') ?? 'standalone').toLowerCase() as PubSubRedisMode;

  if (redisMode === 'cluster') {
    const rawNodes = configService.get<string>('PUBSUB_REDIS_CLUSTER_NODES', '');
    const nodes = parseClusterNodes(rawNodes);

    if (nodes.length === 0) {
      throw new Error('PUBSUB_REDIS_CLUSTER_NODES is required when PUBSUB_REDIS_MODE=cluster');
    }

    const password = configService.get<string>('PUBSUB_REDIS_PASSWORD');
    const tlsEnabled = configService.get<boolean>('PUBSUB_REDIS_TLS', false);

    const options: ClusterOptions = {
      scaleReads: configService.get<'master' | 'slave' | 'all'>('PUBSUB_REDIS_SCALE_READS', 'all'),
      redisOptions: {
        password,
        tls: tlsEnabled ? {} : undefined,
        reconnectOnError: () => true,
        enableAutoPipelining: true,
      },
    } satisfies ClusterOptions;

    return {
      driver: 'redis',
      namespace,
      redis: {
        mode: 'cluster',
        nodes,
        options,
      },
    } satisfies PubSubModuleConfig;
  }

  const redisUrl = configService.get<string>('PUBSUB_REDIS_URL');
  if (redisUrl) {
    return {
      driver: 'redis',
      namespace,
      redis: {
        mode: 'standalone',
        options: redisUrl,
      },
    } satisfies PubSubModuleConfig;
  }

  const host = configService.get<string>('PUBSUB_REDIS_HOST', configService.get<string>('REDIS_HOST', 'localhost'));
  const port = configService.get<number>('PUBSUB_REDIS_PORT', configService.get<number>('REDIS_PORT', 6379));
  const password = configService.get<string>('PUBSUB_REDIS_PASSWORD', configService.get<string>('REDIS_PASSWORD'));
  const db = configService.get<number>('PUBSUB_REDIS_DB', 0);
  const tlsEnabled = configService.get<boolean>('PUBSUB_REDIS_TLS', false);

  const options: RedisOptions = {
    host,
    port,
    password,
    db,
    tls: tlsEnabled ? {} : undefined,
    retryStrategy: times => Math.min(times * 200, 2_000),
    reconnectOnError: () => true,
  } satisfies RedisOptions;

  return {
    driver: 'redis',
    namespace,
    redis: {
      mode: 'standalone',
      options,
    },
  } satisfies PubSubModuleConfig;
};
