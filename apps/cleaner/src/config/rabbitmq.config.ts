import { ConfigService } from '@nestjs/config';

export const createRabbitMQConfig = (configService: ConfigService) => {
  return {
    url: configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
  };
};

export const createCleanerConfig = (configService: ConfigService) => {
  return {
    batchSize: configService.get<number>('BATCH_SIZE', 50),
    concurrentTasks: configService.get<number>('CONCURRENT_TASKS', 5),
  };
};
