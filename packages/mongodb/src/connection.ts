import mongoose from 'mongoose';
import { getModelForClass } from '@typegoose/typegoose';
import { createMongoDBConfig } from './config.js';
import { RawDataSource } from './schemas/raw-data-source.schema.js';
import { root } from '@pro/core';
import { MONGO_CONNECTION } from './tokens.js';

/**
 * 连接到 MongoDB
 * 建立 Mongoose 默认连接，供所有 Typegoose Model 使用
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  const { uri, ...options } = createMongoDBConfig();
  try {
    // 如果已连接，直接返回
    if (mongoose.connection.readyState === 1) {
      console.log('ℹ️  MongoDB 已连接，跳过重复连接');
      return mongoose;
    }
    await mongoose.connect(uri, options);
    // 等待连接完全就绪
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('等待连接就绪超时'));
      }, 5000);
      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve();
      } else {
        mongoose.connection.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });
    // register injector
    root.set([
      {
        provide: MONGO_CONNECTION,
        useValue: mongoose.connection,
      }
    ]);
    return mongoose;
  } catch (error) {
    throw error;
  }
}

/**
 * 断开 MongoDB 连接
 */
export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  try {
    await mongoose.disconnect();
  } catch (error) {
    throw error;
  }
}

/**
 * 获取当前 MongoDB 连接实例
 */
export function getMongoDBConnection(): mongoose.Connection {
  return mongoose.connection;
}

/**
 * 检查是否已连接
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
