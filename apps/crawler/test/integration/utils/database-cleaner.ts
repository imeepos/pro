/**
 * 数据库清理工具
 * 提供优雅的数据库清理功能，确保测试环境的纯净性
 */
import { DataSource } from 'typeorm';
import { DatabaseCleanupOptions, TestCleanupError } from '../types/test-types.js';

/**
 * 数据库清理器 - 测试环境的数字净化师
 * 每一次清理都是对测试环境的重新洗礼
 */
export class DatabaseCleaner {
  private readonly defaultTables = [
    'weibo_accounts',
    'weibo_search_tasks',
    'users',
  ];

  constructor(private readonly database: DataSource) {}

  /**
   * 清理数据库
   * 提供灵活的清理策略，支持多种清理模式
   */
  async cleanup(options: Partial<DatabaseCleanupOptions> = {}): Promise<void> {
    const config: DatabaseCleanupOptions = {
      tables: this.defaultTables,
      truncate: true,
      cascade: false,
      resetSequences: true,
      ...options
    };

    try {
      // 按依赖关系排序表，避免外键约束问题
      const sortedTables = this.sortTablesByDependency(config.tables);

      for (const tableName of sortedTables) {
        await this.cleanupTable(tableName, config);
      }

      if (config.resetSequences) {
        await this.resetSequences(config.tables);
      }
    } catch (error) {
      throw new TestCleanupError(`数据库清理失败: ${(error as Error).message}`, 'cleanup');
    }
  }

  /**
   * 清理单个表
   */
  async cleanupTable(tableName: string, options: Partial<DatabaseCleanupOptions> = {}): Promise<void> {
    const truncate = options.truncate ?? true;
    const cascade = options.cascade ?? false;

    try {
      if (truncate) {
        // 使用TRUNCATE快速清空表
        const cascadeClause = cascade ? ' CASCADE' : '';
        const query = `TRUNCATE TABLE "${tableName}"${cascadeClause}`;
        await this.database.query(query);
      } else {
        // 使用DELETE逐行删除
        const cascadeClause = cascade ? ' CASCADE' : '';
        const query = `DELETE FROM "${tableName}"${cascadeClause}`;
        await this.database.query(query);
      }
    } catch (error) {
      throw new TestCleanupError(`清理表 ${tableName} 失败: ${(error as Error).message}`, `cleanupTable:${tableName}`);
    }
  }

  /**
   * 重置数据库
   * 完全重置数据库到初始状态
   */
  async resetDatabase(): Promise<void> {
    try {
      // 禁用外键约束检查
      await this.database.query('SET session_replication_role = replica;');

      // 清理所有表
      await this.cleanup({
        tables: this.defaultTables,
        truncate: true,
        cascade: true,
        resetSequences: false // 稍后统一重置
      });

      // 重置序列
      await this.resetSequences(this.defaultTables);

      // 重新启用外键约束检查
      await this.database.query('SET session_replication_role = DEFAULT;');
    } catch (error) {
      // 确保重新启用约束检查
      try {
        await this.database.query('SET session_replication_role = DEFAULT;');
      } catch (constraintError) {
        // 忽略约束恢复错误，因为原始错误更重要
      }
      throw new TestCleanupError(`数据库重置失败: ${(error as Error).message}`, 'resetDatabase');
    }
  }

  /**
   * 重置序列
   * 确保自增ID从1开始
   */
  private async resetSequences(tables: string[]): Promise<void> {
    for (const tableName of tables) {
      try {
        // 获取表的序列名称
        const sequenceQuery = `
          SELECT column_default
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          AND column_default LIKE 'nextval%'
          LIMIT 1
        `;

        const result = await this.database.query(sequenceQuery);

        if (result && result.length > 0) {
          const columnDefault = result[0].column_default;
          const sequenceNameMatch = columnDefault.match(/nextval\('(.+?)'\)/);

          if (sequenceNameMatch && sequenceNameMatch[1]) {
            const sequenceName = sequenceNameMatch[1];
            // 重置序列到1
            await this.database.query(`ALTER SEQUENCE ${sequenceName} RESTART WITH 1`);
          }
        }
      } catch (error) {
        // 序列重置失败不应该中断整个清理过程
        console.warn(`重置表 ${tableName} 的序列失败: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 按依赖关系排序表
   * 确保在清理时不会违反外键约束
   */
  private sortTablesByDependency(tables: string[]): string[] {
    // 定义表的依赖关系（被引用的表排在前面）
    const dependencies: Record<string, string[]> = {
      'weibo_search_tasks': ['users', 'weibo_accounts'],
      'weibo_accounts': ['users'],
      'users': [],
    };

    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (table: string): void => {
      if (visiting.has(table)) {
        throw new TestCleanupError(`检测到循环依赖: ${table}`, 'sortTablesByDependency');
      }

      if (visited.has(table)) {
        return;
      }

      visiting.add(table);

      // 先访问依赖的表
      const deps = dependencies[table] || [];
      for (const dep of deps) {
        if (tables.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(table);
      visited.add(table);
      sorted.push(table);
    };

    for (const table of tables) {
      visit(table);
    }

    return sorted;
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.database.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '${tableName}'
        )
      `);

      return result[0].exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取表的记录数
   */
  async getRecordCount(tableName: string): Promise<number> {
    try {
      const result = await this.database.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      return parseInt(result[0].count, 10);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 检查数据库是否为空
   */
  async isDatabaseEmpty(): Promise<boolean> {
    for (const tableName of this.defaultTables) {
      if (await this.tableExists(tableName)) {
        const count = await this.getRecordCount(tableName);
        if (count > 0) {
          return false;
        }
      }
    }
    return true;
  }
}