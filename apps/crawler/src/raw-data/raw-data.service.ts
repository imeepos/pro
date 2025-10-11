import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from 'nestjs-pino';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import * as cheerio from 'cheerio';

export interface RawDataSource {
  sourceType: string;
  sourceUrl: string;
  rawContent: string;
  contentHash: string;
  metadata: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RawDataService {
  constructor(
    @InjectModel('RawDataSource') private rawDataSourceModel: Model<RawDataSource>,
    private readonly logger: Logger
  ) {}

  async create(data: {
    sourceType: string;
    sourceUrl: string;
    rawContent: string;
    metadata: Record<string, any>;
  }): Promise<RawDataSource> {
    const contentHash = this.generateContentHash(data.rawContent);

    const existingRecord = await this.rawDataSourceModel.findOne({
      sourceType: data.sourceType,
      contentHash: contentHash
    });

    if (existingRecord) {
      this.logger.log(`发现重复数据，跳过存储: ${data.sourceUrl}`, 'RawDataService');
      return existingRecord;
    }

    const createdRecord = new this.rawDataSourceModel({
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      rawContent: data.rawContent,
      contentHash: contentHash,
      metadata: data.metadata,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return createdRecord.save();
  }

  async findBySourceUrl(sourceUrl: string): Promise<RawDataSource | null> {
    return this.rawDataSourceModel.findOne({ sourceUrl }).exec();
  }

  async findByMetadata(metadataQuery: Record<string, any>): Promise<RawDataSource[]> {
    const query: any = {};
    for (const [key, value] of Object.entries(metadataQuery)) {
      query[`metadata.${key}`] = value;
    }
    return this.rawDataSourceModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByTaskId(taskId: number): Promise<RawDataSource[]> {
    return this.rawDataSourceModel
      .find({ 'metadata.taskId': taskId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByKeywordAndTimeRange(
    keyword: string,
    startTime: Date,
    endTime: Date
  ): Promise<RawDataSource[]> {
    return this.rawDataSourceModel
      .find({
        'metadata.keyword': keyword,
        createdAt: {
          $gte: startTime,
          $lte: endTime
        }
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: 'pending' | 'processed' | 'failed'): Promise<void> {
    await this.rawDataSourceModel.updateOne(
      { _id: id },
      { status, updatedAt: new Date() }
    );
  }

  async getStatistics(sourceType?: string): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
    byDate: Array<{ date: string; count: number }>;
  }> {
    const matchQuery = sourceType ? { sourceType } : {};

    const stats = await this.rawDataSourceModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processed: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    const byDateStats = await this.rawDataSourceModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    return {
      total: stats[0]?.total || 0,
      pending: stats[0]?.pending || 0,
      processed: stats[0]?.processed || 0,
      failed: stats[0]?.failed || 0,
      byDate: byDateStats.map(item => ({
        date: item._id,
        count: item.count
      }))
    };
  }

  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.rawDataSourceModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: 'processed'
    });

    return result.deletedCount || 0;
  }

  private generateContentHash(content: string): string {
    return createHash('md5')
      .update(content)
      .digest('hex');
  }

  async searchContent(query: {
    keyword?: string;
    sourceType?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: RawDataSource[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      keyword,
      sourceType,
      status,
      startTime,
      endTime,
      page = 1,
      limit = 20
    } = query;

    const filter: any = {};

    if (sourceType) {
      filter.sourceType = sourceType;
    }

    if (status) {
      filter.status = status;
    }

    if (startTime || endTime) {
      filter.createdAt = {};
      if (startTime) filter.createdAt.$gte = startTime;
      if (endTime) filter.createdAt.$lte = endTime;
    }

    if (keyword) {
      filter.$or = [
        { 'metadata.keyword': { $regex: keyword, $options: 'i' } },
        { rawContent: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.rawDataSourceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.rawDataSourceModel.countDocuments(filter)
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }
}