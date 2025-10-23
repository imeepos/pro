import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawDataSourceDoc } from '@pro/mongodb';
import { narrate } from '../utils/logging';

@Injectable()
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(
    @InjectModel('RawDataSource')
    private readonly rawDataModel: Model<RawDataSourceDoc>,
  ) {}

  async getRawDataById(rawDataId: string): Promise<RawDataSourceDoc | null> {
    try {
      const rawData = await this.rawDataModel.findById(rawDataId).exec();

      if (!rawData) {
        this.logger.warn(narrate('原始数据未找到', { rawDataId }));
        return null;
      }

      return rawData;
    } catch (error) {
      this.logger.error(
        narrate('获取原始数据失败', {
          rawDataId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
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

      this.logger.debug(
        narrate('更新原始数据状态', {
          rawDataId,
          status,
          hasError: !!errorMessage,
        }),
      );
    } catch (error) {
      this.logger.error(
        narrate('更新原始数据状态失败', {
          rawDataId,
          status,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }
}
