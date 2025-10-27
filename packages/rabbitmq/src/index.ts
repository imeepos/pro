// Core Services
export { ConnectionPool } from './connection-pool.js';
export { RabbitMQPublisher } from './publisher.service.js';
export { RabbitMQConsumer, type MessageHandler } from './consumer.service.js';
export { RabbitMQService } from './rabbitmq.service.js';
export { DlqManagerService } from './dlq-manager.service.js';

// Legacy Client (for backward compatibility)
export {
  RabbitMQClient,
  type LegacyRabbitMQConfig as RabbitMQConfig,
  type LegacyConsumeOptions as ConsumeOptions,
} from './legacy-client.js';

// Types
export type {
  RabbitMQConfig as ModuleRabbitMQConfig,
  PublishOptions,
  ConsumerOptions,
  RetryStrategy,
  ConnectionPoolConfig,
  MessageMetadata,
  BatchPublishResult,
  QueueStats,
  ConnectionState,
  ConnectionEvent,
  DlqConnectionStatus,
} from './types.js';
