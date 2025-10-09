import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWeiboSearchTasksTable1759985276000 implements MigrationInterface {
  name = 'CreateWeiboSearchTasksTable1759985276000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'weibo_search_tasks',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'keyword',
            type: 'varchar',
            length: '200',
            isNullable: false,
            comment: '搜索关键词',
          },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: false,
            comment: '监控起始时间',
          },
          {
            name: 'current_crawl_time',
            type: 'timestamp',
            isNullable: true,
            comment: '历史回溯进度(向startDate递减)',
          },
          {
            name: 'latest_crawl_time',
            type: 'timestamp',
            isNullable: true,
            comment: '最新数据时间(用于增量抓取)',
          },
          {
            name: 'crawl_interval',
            type: 'varchar',
            length: '20',
            default: "'1h'",
            isNullable: false,
            comment: '抓取间隔(如: 1h, 30m, 1d)',
          },
          {
            name: 'next_run_at',
            type: 'timestamp',
            isNullable: true,
            comment: '下次执行时间',
          },
          {
            name: 'weibo_account_id',
            type: 'bigint',
            isNullable: true,
            comment: '指定微博账号ID',
          },
          {
            name: 'enable_account_rotation',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: '是否启用账号轮换',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
            comment: '任务状态: pending|running|paused|failed|timeout',
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: '是否启用任务',
          },
          {
            name: 'progress',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: '已完成段数',
          },
          {
            name: 'total_segments',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: '总段数估算',
          },
          {
            name: 'no_data_count',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: '连续无数据次数',
          },
          {
            name: 'no_data_threshold',
            type: 'integer',
            default: 3,
            isNullable: false,
            comment: '无数据判定阈值',
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: '当前重试次数',
          },
          {
            name: 'max_retries',
            type: 'integer',
            default: 3,
            isNullable: false,
            comment: '最大重试次数',
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
            comment: '错误信息',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        checks: [
          {
            name: 'CHK_weibo_search_tasks_status',
            expression: "status IN ('pending', 'running', 'paused', 'failed', 'timeout')",
          },
          {
            name: 'CHK_weibo_search_tasks_progress',
            expression: 'progress >= 0 AND total_segments >= 0',
          },
          {
            name: 'CHK_weibo_search_tasks_retry',
            expression: 'retry_count >= 0 AND max_retries >= 0 AND retry_count <= max_retries',
          },
          {
            name: 'CHK_weibo_search_tasks_no_data',
            expression: 'no_data_count >= 0 AND no_data_threshold > 0',
          },
        ],
      }),
      true,
    );

    // 创建复合索引：用于调度器扫描启用状态且到达执行时间的任务
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_enabled_next_run',
        columnNames: ['enabled', 'next_run_at'],
        isUnique: false,
      }),
    );

    // 创建状态索引：用于监控器查询特定状态的任务
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_status',
        columnNames: ['status'],
        isUnique: false,
      }),
    );

    // 创建关键词索引：支持按关键词搜索任务
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_keyword',
        columnNames: ['keyword'],
        isUnique: false,
      }),
    );

    // 创建微博账号ID索引：支持按账号查询任务
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_weibo_account_id',
        columnNames: ['weibo_account_id'],
        isUnique: false,
      }),
    );

    // 创建时间索引：支持按时间范围查询任务
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_start_date',
        columnNames: ['start_date'],
        isUnique: false,
      }),
    );

    // 创建当前抓取时间索引：支持查询历史回溯进度
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_current_crawl_time',
        columnNames: ['current_crawl_time'],
        isUnique: false,
      }),
    );

    // 创建最新抓取时间索引：支持查询增量更新基准
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_latest_crawl_time',
        columnNames: ['latest_crawl_time'],
        isUnique: false,
      }),
    );

    // 添加表注释
    await queryRunner.query(`
      COMMENT ON TABLE weibo_search_tasks IS '微博关键词搜索主任务表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 按照创建的相反顺序删除索引
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_latest_crawl_time');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_current_crawl_time');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_start_date');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_weibo_account_id');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_keyword');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_status');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_enabled_next_run');

    // 删除表
    await queryRunner.dropTable('weibo_search_tasks');
  }
}