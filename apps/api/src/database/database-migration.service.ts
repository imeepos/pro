import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BugStatus } from '@pro/types';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.migrateEnumValues();
    await this.synchronizeDatabase();
  }

  private async migrateEnumValues() {
    try {
      // 检查 bugs 表是否存在
      const tableExists = await this.checkTableExists('bugs');
      if (!tableExists) {
        this.logger.log('bugs 表不存在，跳过枚举迁移');
        return;
      }

      // 获取所有有效的枚举值
      const validStatuses = Object.values(BugStatus);

      // 查询不兼容的记录
      const incompatibleRecords = await this.dataSource.query(
        `SELECT id, status FROM bugs WHERE status NOT IN (${validStatuses.map((_, i) => `$${i + 1}`).join(', ')})`,
        validStatuses
      );

      if (incompatibleRecords.length > 0) {
        this.logger.warn(
          `发现 ${incompatibleRecords.length} 条不兼容的 bug 记录，将删除这些记录`
        );

        // 删除不兼容的记录
        await this.dataSource.query(
          `DELETE FROM bugs WHERE status NOT IN (${validStatuses.map((_, i) => `$${i + 1}`).join(', ')})`,
          validStatuses
        );

        this.logger.log('不兼容记录已清理');
      } else {
        this.logger.log('未发现不兼容的枚举值');
      }
    } catch (error) {
      // 如果表不存在或其他错误，记录但不阻止启动
      this.logger.warn(`枚举迁移检查失败: ${error.message}`);
    }
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

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName]
      );
      return result[0]?.exists || false;
    } catch {
      return false;
    }
  }
}
