import { ConfigService } from '@nestjs/config';

/**
 * MongoDB 配置接口
 */
export interface MongodbConfig {
  uri: string;
  maxPoolSize: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  bufferMaxEntries: number;
  bufferCommands: boolean;
}

/**
 * MongoDB 配置工厂函数
 */
export const mongodbConfigFactory = (configService: ConfigService): MongodbConfig => {
  const uri = configService.get<string>('MONGODB_URI');

  if (!uri) {
    throw new Error('MONGODB_URI 环境变量未设置');
  }

  return {
    uri,
    maxPoolSize: configService.get<number>('MONGODB_MAX_POOL_SIZE', 10),
    serverSelectionTimeoutMS: configService.get<number>('MONGODB_SERVER_SELECTION_TIMEOUT', 5000),
    socketTimeoutMS: configService.get<number>('MONGODB_SOCKET_TIMEOUT', 45000),
    bufferMaxEntries: configService.get<number>('MONGODB_BUFFER_MAX_ENTRIES', 0),
    bufferCommands: configService.get<boolean>('MONGODB_BUFFER_COMMANDS', false),
  };
};