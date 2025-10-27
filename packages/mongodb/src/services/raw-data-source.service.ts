import { Injectable } from '@pro/core';
import { FilterQuery } from 'mongoose';
import { RawDataSourceDoc, RawDataSourceSchema } from '../schemas/raw-data-source.schema.js';
import { CreateRawDataSourceDto, ProcessingStatus, SourceType } from '@pro/types';
import { calculateContentHash } from '../utils/hash.util.js';
import { useMongoDb } from '../factory.js';

/**
 * 原始数据源服务
 */
@Injectable()
export class RawDataSourceService {
  /**
   * 创建原始数据记录
   */
  async create(dto: CreateRawDataSourceDto): Promise<RawDataSourceDoc> {

    // 如果 contentHash 已存在就返回现有记录
    useMongoDb(async c => {
      const contentHash = calculateContentHash(dto.rawContent);

      const existing = await c.model(``, RawDataSourceSchema)
        .findOne({ contentHash })
        .exec();

      if (existing) {
        return existing;
      }

      // contentHash 不存在，插入新记录
      const data = new this.rawDataSourceModel({
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl,
        rawContent: dto.rawContent,
        contentHash,
        metadata: dto.metadata,
        status: ProcessingStatus.PENDING,
      });

      return data.save();

    })

  }

  /**
   * 根据 ID 查询
   */
  async findById(id: string) {
    return this.rawDataSourceModel.findById(id).exec();
  }

  /**
   * 查找已存在的原始数据记录（按来源标识）
   */
  async findExistingSourceRecord(options: {
    sourceType: SourceType;
    sourceUrl?: string;
    statusId?: string;
  }): Promise<RawDataSourceDoc | null> {
    const { sourceType, sourceUrl, statusId } = options;
    const criteria: FilterQuery<RawDataSourceDoc> = { sourceType };
    const identifiers: FilterQuery<RawDataSourceDoc>[] = [];

    if (sourceUrl) {
      identifiers.push({ sourceUrl });
    }

    if (statusId) {
      identifiers.push({ 'metadata.statusId': statusId });
    }

    if (identifiers.length > 0) {
      criteria.$or = identifiers;
    }

    return this.rawDataSourceModel.findOne(criteria).exec();
  }

  /**
   * 查询待处理数据
   */
  async findPending(limit = 100) {
    return this.rawDataSourceModel
      .find({ status: ProcessingStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * 标记为处理中
   */
  async markProcessing(id: string) {
    return this.rawDataSourceModel
      .findByIdAndUpdate(
        id,
        { status: ProcessingStatus.PROCESSING },
        { new: true },
      )
      .exec();
  }

  /**
   * 标记为已完成
   */
  async markCompleted(id: string) {
    return this.rawDataSourceModel
      .findByIdAndUpdate(
        id,
        {
          status: ProcessingStatus.COMPLETED,
          processedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * 标记为失败
   */
  async markFailed(id: string, errorMessage: string) {
    return this.rawDataSourceModel
      .findByIdAndUpdate(
        id,
        {
          status: ProcessingStatus.FAILED,
          errorMessage,
          processedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * 清理已完成的旧数据
   */
  async deleteOldCompleted(days = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.rawDataSourceModel
      .deleteMany({
        status: ProcessingStatus.COMPLETED,
        createdAt: { $lt: cutoffDate },
      })
      .exec();

    return result.deletedCount || 0;
  }

  /**
   * 统计各状态数据量
   */
  async getStatistics(): Promise<Record<string, number>> {
    const result = await this.rawDataSourceModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 复杂查询：支持多种过滤条件和分页
   */
  async findWithFilters(options: {
    status?: ProcessingStatus;
    sourceType?: SourceType;
    keyword?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      status,
      sourceType,
      keyword,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = options;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (sourceType) {
      query.sourceType = sourceType;
    }

    if (keyword) {
      query.$or = [
        { sourceUrl: { $regex: keyword, $options: 'i' } },
        { rawContent: { $regex: keyword, $options: 'i' } },
        { 'metadata.title': { $regex: keyword, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = startDate;
      }
      if (endDate) {
        query.createdAt.$lte = endDate;
      }
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.rawDataSourceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.rawDataSourceModel.countDocuments(query).exec()
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1
    };
  }

  /**
   * 获取数据源类型统计
   */
  async getSourceTypeStatistics(): Promise<Record<string, number>> {
    const result = await this.rawDataSourceModel.aggregate([
      {
        $group: {
          _id: '$sourceType',
          count: { $sum: 1 },
        },
      },
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 获取趋势数据
   */
  async getTrendData(options: {
    granularity: 'hour' | 'day' | 'week' | 'month';
    status?: ProcessingStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { granularity, status, startDate, endDate } = options;

    const matchStage: any = {};
    if (status) {
      matchStage.status = status;
    }
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = startDate;
      }
      if (endDate) {
        matchStage.createdAt.$lte = endDate;
      }
    }

    const groupFormat = this.getDateFormat(granularity);
    const pipeline = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 as 1 }
      },
      {
        $project: {
          _id: 0,
          timestamp: '$_id',
          count: 1
        }
      }
    );

    return this.rawDataSourceModel.aggregate(pipeline);
  }

  /**
   * 批量重试失败的数据
   */
  async retryFailedData(limit: number = 50): Promise<number> {
    const result = await this.rawDataSourceModel.updateMany(
      { status: ProcessingStatus.FAILED },
      {
        status: ProcessingStatus.PENDING,
        $unset: { errorMessage: 1, processedAt: 1 }
      },
      { limit }
    );

    return result.modifiedCount || 0;
  }

  /**
   * 获取日期格式字符串
   */
  private getDateFormat(granularity: string): string {
    switch (granularity) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%U';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }
}
