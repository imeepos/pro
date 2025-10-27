import { createConnection, type Connection } from 'mongoose';
import { createMongoDBConfig } from './config.js';

export const useMongoDb = async <T>(h: (c: Connection)=>Promise<T>): Promise<T> => {
  const { uri, ...options } = createMongoDBConfig();
  const connection = createConnection(uri, options);
  await connection.asPromise();
  const res = await h(connection)
  await connection.close()
  return res;
};
