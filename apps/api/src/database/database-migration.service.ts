import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.synchronizeDatabase();
  }

  private async synchronizeDatabase() {
    try {
      this.logger.log('开始同步数据库架构...');
      await this.dataSource.synchronize();
      this.logger.log('数据库架构同步完成');
    } catch (error) {
      this.logger.error(`数据库同步失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
