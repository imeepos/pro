import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddUserIdToWeiboSearchTasks1759985544323 implements MigrationInterface {
  name = 'AddUserIdToWeiboSearchTasks1759985544323';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 user_id 字段
    await queryRunner.addColumn(
      'weibo_search_tasks',
      new TableColumn({
        name: 'user_id',
        type: 'varchar',
        length: '255',
        isNullable: false,
        comment: '用户ID，关联用户表',
      }),
    );

    // 创建用户ID索引
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_user_id',
        columnNames: ['user_id'],
        isUnique: false,
      }),
    );

    // 添加外键约束（如果用户表存在）
    // 注意：这里假设用户表名为 users，主键为 id
    // 如果实际表结构不同，需要相应调整
    try {
      await queryRunner.createForeignKey(
        'weibo_search_tasks',
        new TableForeignKey({
          name: 'fk_weibo_search_tasks_user_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    } catch (error) {
      // 如果外键创建失败（比如用户表不存在），记录日志但不中断迁移
      console.warn('创建外键约束失败，可能用户表不存在或结构不同:', error.message);
    }

    // 修正关键词字段长度（从200改为100，与实体保持一致）
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      ALTER COLUMN keyword TYPE varchar(100);
    `);

    // 修正 enable_account_rotation 默认值（从 true 改为 false，与实体保持一致）
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      ALTER COLUMN enable_account_rotation SET DEFAULT false;
    `);

    // 为现有记录设置默认的 enable_account_rotation 值
    await queryRunner.query(`
      UPDATE weibo_search_tasks
      SET enable_account_rotation = false
      WHERE enable_account_rotation IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    try {
      await queryRunner.dropForeignKey('weibo_search_tasks', 'fk_weibo_search_tasks_user_id');
    } catch (error) {
      // 外键可能不存在，忽略错误
      console.warn('删除外键约束失败:', error.message);
    }

    // 删除用户ID索引
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_user_id');

    // 删除 user_id 字段
    await queryRunner.dropColumn('weibo_search_tasks', 'user_id');

    // 恢复关键词字段长度
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      ALTER COLUMN keyword TYPE varchar(200);
    `);

    // 恢复 enable_account_rotation 默认值
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      ALTER COLUMN enable_account_rotation SET DEFAULT true;
    `);
  }
}