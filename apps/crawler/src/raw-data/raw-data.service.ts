import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@pro/logger';
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

    // 检查基于 contentHash 的重复
    const existingByHash = await this.rawDataSourceModel.findOne({
      sourceType: data.sourceType,
      contentHash: contentHash
    });

    if (existingByHash) {
      this.logger.log(`发现重复内容，跳过存储: [sourceUrl=${data.sourceUrl}] [contentHash=${contentHash}] [created=${existingByHash.createdAt?.toISOString()}]`, 'RawDataService');
      return existingByHash;
    }

    // 检查基于 sourceUrl 的重复
    const existingByUrl = await this.rawDataSourceModel.findOne({
      sourceUrl: data.sourceUrl
    });

    if (existingByUrl) {
      this.logger.log(`发现重复URL，跳过存储: [sourceUrl=${data.sourceUrl}] [created=${existingByUrl.createdAt?.toISOString()}]`, 'RawDataService');
      return existingByUrl;
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

    try {
      return await createdRecord.save();
    } catch (error: any) {
      // 处理 MongoDB E11000 重复键错误
      if (error.code === 11000) {
        this.logger.warn(`检测到MongoDB重复键冲突: [sourceUrl=${data.sourceUrl}] [error=${error.message}]`, 'RawDataService');

        // 根据错误信息判断是 sourceUrl 还是 contentHash 冲突
        if (error.message.includes('sourceUrl_1')) {
          const existing = await this.rawDataSourceModel.findOne({ sourceUrl: data.sourceUrl });
          if (existing) {
            this.logger.log(`已获取重复URL的现有记录: [sourceUrl=${data.sourceUrl}] [created=${existing.createdAt?.toISOString()}]`, 'RawDataService');
            return existing;
          }
        }

        if (error.message.includes('contentHash')) {
          const existing = await this.rawDataSourceModel.findOne({ contentHash: contentHash });
          if (existing) {
            this.logger.log(`已获取重复内容的现有记录: [contentHash=${contentHash}] [created=${existing.createdAt?.toISOString()}]`, 'RawDataService');
            return existing;
          }
        }
      }

      // 重新抛出非重复键的其他错误
      throw error;
    }
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