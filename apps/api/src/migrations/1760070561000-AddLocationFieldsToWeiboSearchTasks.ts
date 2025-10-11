import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddLocationFieldsToWeiboSearchTasks1760070561000 implements MigrationInterface {
  name = 'AddLocationFieldsToWeiboSearchTasks1760070561000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加经度字段
    await queryRunner.addColumn(
      'weibo_search_tasks',
      new TableColumn({
        name: 'longitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
        comment: '经度，地理坐标精度：10位整数，7位小数',
      }),
    );

    // 添加纬度字段
    await queryRunner.addColumn(
      'weibo_search_tasks',
      new TableColumn({
        name: 'latitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
        comment: '纬度，地理坐标精度：10位整数，7位小数',
      }),
    );

    // 添加位置地址字段
    await queryRunner.addColumn(
      'weibo_search_tasks',
      new TableColumn({
        name: 'location_address',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: '位置地址，详细地址描述',
      }),
    );

    // 添加位置名称字段
    await queryRunner.addColumn(
      'weibo_search_tasks',
      new TableColumn({
        name: 'location_name',
        type: 'varchar',
        length: '200',
        isNullable: true,
        comment: '位置名称，地点名称',
      }),
    );

    // 创建地理位置复合索引（经纬度）
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_geolocation',
        columnNames: ['longitude', 'latitude'],
        isUnique: false,
      }),
    );

    // 创建位置名称索引
    await queryRunner.createIndex(
      'weibo_search_tasks',
      new TableIndex({
        name: 'idx_location_name',
        columnNames: ['location_name'],
        isUnique: false,
      }),
    );

    // 添加地理位置数据有效性检查
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      ADD CONSTRAINT chk_weibo_search_tasks_geolocation
      CHECK (
        (longitude IS NULL AND latitude IS NULL) OR
        (longitude >= -180 AND longitude <= 180 AND latitude >= -90 AND latitude <= 90)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除地理位置数据有效性检查
    await queryRunner.query(`
      ALTER TABLE weibo_search_tasks
      DROP CONSTRAINT IF EXISTS chk_weibo_search_tasks_geolocation;
    `);

    // 删除索引（按照创建的相反顺序）
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_location_name');
    await queryRunner.dropIndex('weibo_search_tasks', 'idx_geolocation');

    // 删除字段
    await queryRunner.dropColumn('weibo_search_tasks', 'location_name');
    await queryRunner.dropColumn('weibo_search_tasks', 'location_address');
    await queryRunner.dropColumn('weibo_search_tasks', 'latitude');
    await queryRunner.dropColumn('weibo_search_tasks', 'longitude');
  }
}