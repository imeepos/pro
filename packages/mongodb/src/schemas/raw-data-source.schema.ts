import { Document } from 'mongoose';

/**
 * 原始数据源 Schema
 */
@Schema({ collection: 'raw_data_sources', timestamps: { createdAt: true, updatedAt: false } })
export class RawDataSource {
  @Prop({ required: true, index: true })
  sourceType!: string;

  @Prop({ required: true })
  sourceUrl!: string;

  @Prop({ required: true })
  rawContent!: string;

  @Prop({ required: true, unique: true, sparse: true })
  contentHash!: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true, default: 'pending', index: true })
  status!: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Date })
  createdAt!: Date;
}

export type RawDataSourceDoc = RawDataSource & Document;
export const RawDataSourceSchema = SchemaFactory.createForClass(RawDataSource);
// 创建复合索引
RawDataSourceSchema.index({ status: 1, createdAt: 1 });
