import type { ConnectOptions } from 'mongoose';

export interface MongoDBConfig extends ConnectOptions {
  uri: string;
}

export const createMongoDBConfig = (): MongoDBConfig => {
  return {
    uri: process.env.MONGODB_URL || 'mongodb://localhost:27017/pro',
    serverSelectionTimeoutMS: 30000,  // 服务器选择超时 30秒
    socketTimeoutMS: 60000,  // Socket 超时 60秒
    connectTimeoutMS: 30000,  // 连接超时 30秒
    maxPoolSize: 10,
    minPoolSize: 2,
    bufferCommands: false,  // 禁用命令缓冲，立即失败而不是等待
    autoIndex: false,  // 生产环境不自动创建索引
  };
};
