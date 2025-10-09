import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEventTable1728385220000 implements MigrationInterface {
  name = 'CreateEventTable1728385220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 启用 PostGIS 扩展(如果还没有启用)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    await queryRunner.createTable(
      new Table({
        name: 'event',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'event_type_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'industry_type_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'event_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'occur_time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'province',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'district',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'street',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'location_text',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'numeric',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'numeric',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'smallint',
            default: 0,
            isNullable: false,
            comment: '状态(0:草稿 1:已发布 2:已归档)',
          },
          {
            name: 'created_by',
            type: 'bigint',
            isNullable: true,
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
      }),
      true,
    );

    await queryRunner.createIndex(
      'event',
      new TableIndex({
        name: 'IDX_event_event_type_id',
        columnNames: ['event_type_id'],
      }),
    );

    await queryRunner.createIndex(
      'event',
      new TableIndex({
        name: 'IDX_event_industry_type_id',
        columnNames: ['industry_type_id'],
      }),
    );

    await queryRunner.createIndex(
      'event',
      new TableIndex({
        name: 'IDX_event_occur_time',
        columnNames: ['occur_time'],
      }),
    );

    await queryRunner.createIndex(
      'event',
      new TableIndex({
        name: 'IDX_event_location',
        columnNames: ['province', 'city', 'district'],
      }),
    );

    await queryRunner.createIndex(
      'event',
      new TableIndex({
        name: 'IDX_event_status',
        columnNames: ['status'],
      }),
    );

    // 创建空间索引 - 使用 PostGIS 的 GIST 索引
    await queryRunner.query(`
      CREATE INDEX "IDX_event_geo_location" ON "event"
      USING GIST (ST_MakePoint(longitude::float, latitude::float));
    `);

    await queryRunner.createForeignKey(
      'event',
      new TableForeignKey({
        name: 'FK_event_event_type_id',
        columnNames: ['event_type_id'],
        referencedTableName: 'event_type',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'event',
      new TableForeignKey({
        name: 'FK_event_industry_type_id',
        columnNames: ['industry_type_id'],
        referencedTableName: 'industry_type',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('event', 'FK_event_industry_type_id');
    await queryRunner.dropForeignKey('event', 'FK_event_event_type_id');
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_event_geo_location";`);
    await queryRunner.dropIndex('event', 'IDX_event_status');
    await queryRunner.dropIndex('event', 'IDX_event_location');
    await queryRunner.dropIndex('event', 'IDX_event_occur_time');
    await queryRunner.dropIndex('event', 'IDX_event_industry_type_id');
    await queryRunner.dropIndex('event', 'IDX_event_event_type_id');
    await queryRunner.dropTable('event');
  }
}
