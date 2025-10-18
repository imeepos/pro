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
      const tableExists = await this.checkTableExists('bugs');
      if (!tableExists) {
        this.logger.log('bugs 表不存在，跳过枚举迁移');
        return;
      }

      const migrations = await this.migrateBugStatusValues();

      if (migrations > 0) {
        this.logger.log(`已迁移 ${migrations} 条 bug 状态值`);
      }
    } catch (error) {
      this.logger.warn(`枚举迁移检查失败: ${error.message}`);
    }
  }

  private async migrateBugStatusValues(): Promise<number> {
    const statusMappings: Record<string, BugStatus> = {
      'open': BugStatus.OPEN,
      'in_progress': BugStatus.IN_PROGRESS,
      'resolved': BugStatus.RESOLVED,
      'closed': BugStatus.CLOSED,
      'rejected': BugStatus.REJECTED,
      'reopened': BugStatus.REOPENED,
    };

    let totalMigrated = 0;

    for (const [oldValue, newValue] of Object.entries(statusMappings)) {
      const result = await this.dataSource.query(
        `UPDATE bugs SET status = $1 WHERE status = $2`,
        [newValue, oldValue]
      );

      const migratedCount = result[1];
      if (migratedCount > 0) {
        this.logger.log(`迁移 bug.status: '${oldValue}' -> '${newValue}' (${migratedCount} 条)`);
        totalMigrated += migratedCount;
      }
    }

    return totalMigrated;
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
