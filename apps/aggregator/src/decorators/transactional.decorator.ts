import { SetMetadata } from '@nestjs/common';
import { TransactionOptions } from '../services/transaction.service';

export const TRANSACTIONAL_METADATA_KEY = 'transactional';

export interface TransactionalConfig extends TransactionOptions {
  description?: string;
}

export const Transactional = (config: TransactionalConfig = {}): MethodDecorator => {
  return SetMetadata(TRANSACTIONAL_METADATA_KEY, {
    retryOnDeadlock: true,
    maxRetries: 3,
    retryDelayBase: 100,
    isolationLevel: 'READ COMMITTED',
    ...config,
  });
};

export const CriticalTransaction = (config: Omit<TransactionalConfig, 'isolationLevel'> = {}): MethodDecorator => {
  return Transactional({
    isolationLevel: 'SERIALIZABLE',
    maxRetries: 5,
    retryDelayBase: 200,
    description: '关键事务操作',
    ...config,
  });
};

export const BatchTransaction = (config: Omit<TransactionalConfig, 'isolationLevel'> = {}): MethodDecorator => {
  return Transactional({
    isolationLevel: 'READ COMMITTED',
    maxRetries: 2,
    retryDelayBase: 50,
    description: '批量事务操作',
    ...config,
  });
};