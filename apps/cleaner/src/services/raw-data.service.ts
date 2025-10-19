import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PinoLogger } from '@pro/logger';
import { RawDataSourceDoc } from '@pro/mongodb';

@Injectable()
export class RawDataService {
  constructor(
    @InjectModel('RawDataSource')
    private readonly rawDataModel: Model<RawDataSourceDoc>,
    private readonly logger: PinoLogger,
  ) {}

  async getRawDataById(rawDataId: string): Promise<RawDataSourceDoc | null> {
    try {
      const rawData = await this.rawDataModel.findById(rawDataId).exec();

      if (!rawData) {
        this.logger.warn('原始数据未找到', { rawDataId });
        return null;
      }

      return rawData;
    } catch (error) {
      this.logger.error('获取原始数据失败', {
        rawDataId,
        error: error.message,
      });
      throw error;
    }
  }

  async updateStatus(
    rawDataId: string,
    status: 'processed' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      const update: any = {
        status,
        processedAt: new Date(),
      };

      if (errorMessage) {
        update.errorMessage = errorMessage;
      }

      await this.rawDataModel.findByIdAndUpdate(rawDataId, update).exec();

      this.logger.debug('更新原始数据状态', {
        rawDataId,
        status,
        hasError: !!errorMessage,
      });
    } catch (error) {
      this.logger.error('更新原始数据状态失败', {
        rawDataId,
        status,
        error: error.message,
      });
      throw error;
    }
  }
}
