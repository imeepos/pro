import type { ConnectOptions } from 'mongoose';

export interface MongoDBConfig extends ConnectOptions {
  uri: string;
}

export const createMongoDBConfig = (): MongoDBConfig => {
  return {
    uri: process.env.MONGODB_URL || 'mongodb://localhost:27017/pro'
  };
};
