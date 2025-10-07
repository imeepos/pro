import { MongoClient, Db, Collection, Document, Filter, OptionalId } from 'mongodb';

export interface MongoDBConfig {
  url: string;
  dbName: string;
}

export class MongoDBClient {
  private client: MongoClient;
  private db?: Db;

  constructor(private config: MongoDBConfig) {
    this.client = new MongoClient(config.url);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.config.dbName);
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.collection<T>(name);
  }

  async insertOne<T extends Document>(collectionName: string, doc: OptionalId<T>): Promise<string> {
    const collection = this.getCollection<T>(collectionName);
    const result = await collection.insertOne(doc);
    return result.insertedId.toString();
  }

  async findOne<T extends Document>(collectionName: string, filter: Filter<T>): Promise<T | null> {
    const collection = this.getCollection<T>(collectionName);
    return collection.findOne(filter);
  }

  async find<T extends Document>(collectionName: string, filter: Filter<T>): Promise<T[]> {
    const collection = this.getCollection<T>(collectionName);
    return collection.find(filter).toArray();
  }

  async updateOne<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    update: Partial<T>,
  ): Promise<boolean> {
    const collection = this.getCollection<T>(collectionName);
    const result = await collection.updateOne(filter, { $set: update });
    return result.modifiedCount > 0;
  }

  async deleteOne<T extends Document>(collectionName: string, filter: Filter<T>): Promise<boolean> {
    const collection = this.getCollection<T>(collectionName);
    const result = await collection.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
