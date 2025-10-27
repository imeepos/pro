import mongoose from 'mongoose';
import { getModelForClass } from '@typegoose/typegoose';
import { createMongoDBConfig } from './config.js';
import { RawDataSource } from './schemas/raw-data-source.schema.js';

/**
 * 连接到 MongoDB
 * 建立 Mongoose 默认连接，供所有 Typegoose Model 使用
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  const { uri, ...options } = createMongoDBConfig();

  console.log('🔌 正在连接 MongoDB...');
  console.log('   URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // 隐藏密码

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

    console.log('✅ MongoDB 连接成功！');
    console.log('   数据库:', mongoose.connection.db?.databaseName);
    console.log('   状态:', getConnectionStatus());

    // 重新初始化 Typegoose Models，确保它们使用正确的连接
    try {
      // 删除已存在的模型（如果有）
      const modelNames = ['RawDataSource'];
      for (const name of modelNames) {
        if (mongoose.connection.models[name]) {
          console.log(`🔄 删除旧的 ${name} Model`);
          delete mongoose.connection.models[name];
        }
      }

      // 先用 Typegoose 获取 schema
      const tempModel = getModelForClass(RawDataSource);
      const schema = tempModel.schema;

      // 配置 schema
      schema.set('bufferCommands', false);
      schema.set('autoIndex', false);

      // 使用 mongoose.connection.model() 重新创建 Model，确保使用正确的连接
      // 这样创建的 Model 会完全绑定到 mongoose.connection
      const model = mongoose.connection.model('RawDataSource', schema, 'raw_data_sources');

      console.log('✅ Typegoose Models 已重新初始化');
      console.log('   Model Name:', model.modelName);
      console.log('   Model.db === mongoose.connection:', model.db === mongoose.connection);
      console.log('   Model.db.readyState:', model.db.readyState);
      console.log('   collection.conn.readyState:', (model.collection as any).conn?.readyState);
      console.log('   Models in connection:', Object.keys(mongoose.connection.models));
    } catch (error) {
      console.error('❌ Model 重新初始化失败:', error instanceof Error ? error.message : error);
      console.error('   Stack:', error instanceof Error ? error.stack : '');
      throw error;
    }

    return mongoose;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 断开 MongoDB 连接
 */
export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    console.log('ℹ️  MongoDB 已处于断开状态');
    return;
  }

  console.log('🔌 正在断开 MongoDB 连接...');
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB 已断开连接');
  } catch (error) {
    console.error('❌ 断开连接失败:', error instanceof Error ? error.message : error);
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
 * 获取连接状态描述
 */
export function getConnectionStatus(): string {
  const states: Record<number, string> = {
    0: '已断开',
    1: '已连接',
    2: '连接中',
    3: '断开中',
  };
  return states[mongoose.connection.readyState] || '未知';
}

/**
 * 检查是否已连接
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
