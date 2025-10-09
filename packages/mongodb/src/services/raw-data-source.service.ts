import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawDataSource, RawDataSourceDoc } from '../schemas/raw-data-source.schema';
import { CreateRawDataSourceDto, ProcessingStatus } from '../types/raw-data-source.types';
import { calculateContentHash } from '../utils/hash.util';

/**
 * 原始数据源服务
 */
@Injectable()
export class RawDataSourceService {
  private readonly logger = new Logger(RawDataSourceService.name);

  constructor(
    @InjectModel(RawDataSource.name)
    private readonly rawDataSourceModel: Model<RawDataSourceDoc>,
  ) {}

  /**
   * 创建原始数据记录
   */
  async create(dto: CreateRawDataSourceDto) {
    const contentHash = calculateContentHash(dto.rawContent);

    const data = new this.rawDataSourceModel({
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl,
      rawContent: dto.rawContent,
      contentHash,
      weiboId: dto.weiboId,
      userId: dto.userId,
      status: ProcessingStatus.PENDING,
    });

    try {
      return await data.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        this.logger.warn(`Duplicate content hash: ${contentHash}`);
        throw new Error('Duplicate content');
      }
      throw error;
    }
  }

  /**
   * 根据 ID 查询
   */
  async findById(id: string) {
    return this.rawDataSourceModel.findById(id).exec();
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
   * 根据微博 ID 查询
   */
  async findByWeiboId(weiboId: string) {
    return this.rawDataSourceModel.find({ weiboId }).exec();
  }

  /**
   * 根据用户 ID 查询
   */
  async findByUserId(userId: string) {
    return this.rawDataSourceModel.find({ userId }).exec();
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

    this.logger.log(`Deleted ${result.deletedCount} old completed records`);
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
}
