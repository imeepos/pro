import { prop, getModelForClass, index, Severity } from '@typegoose/typegoose';
import { type Document } from 'mongoose';
import { Schema } from './decorator.js';

/**
 * 原始数据源 Schema
 */
@Schema({
  schemaOptions: {
    collection: 'raw_data_sources',
    timestamps: { createdAt: true, updatedAt: false },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
@index({ status: 1, createdAt: 1 })
export class RawDataSource {
  @prop({ required: true, index: true, type: String })
  sourceType!: string;

  @prop({ required: true, type: String })
  sourceUrl!: string;

  @prop({ required: true, type: String })
  rawContent!: string;

  @prop({ required: true, unique: true, sparse: true, type: String })
  contentHash!: string;

  @prop({ type: () => Object })
  metadata?: Record<string, any>;

  @prop({ required: true, default: 'pending', index: true, type: String })
  status!: string;

  @prop({ type: Date })
  processedAt?: Date;

  @prop({ type: String })
  errorMessage?: string;

  @prop({ type: Date })
  createdAt!: Date;
}

export type RawDataSourceDoc = RawDataSource & Document;

// Typegoose 方式创建 Schema 和 Model
// 注意：使用 Typegoose 时，Model 会自动使用 mongoose.connection（默认连接）
// 确保在调用 connectMongoDB() 之后再使用这些 Model
export const RawDataSourceModel = getModelForClass(RawDataSource);
export const RawDataSourceSchema = RawDataSourceModel.schema;
