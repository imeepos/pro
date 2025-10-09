import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEventTypeTable1728385210000 implements MigrationInterface {
  name = 'CreateEventTypeTable1728385210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_type',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'event_code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'event_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'industry_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'smallint',
            default: 1,
            isNullable: false,
            comment: '状态(0:禁用 1:启用)',
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
      'event_type',
      new TableIndex({
        name: 'IDX_event_type_event_code',
        columnNames: ['event_code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'event_type',
      new TableIndex({
        name: 'IDX_event_type_industry_id',
        columnNames: ['industry_id'],
      }),
    );

    await queryRunner.createIndex(
      'event_type',
      new TableIndex({
        name: 'IDX_event_type_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createForeignKey(
      'event_type',
      new TableForeignKey({
        name: 'FK_event_type_industry_id',
        columnNames: ['industry_id'],
        referencedTableName: 'industry_type',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('event_type', 'FK_event_type_industry_id');
    await queryRunner.dropIndex('event_type', 'IDX_event_type_status');
    await queryRunner.dropIndex('event_type', 'IDX_event_type_industry_id');
    await queryRunner.dropIndex('event_type', 'IDX_event_type_event_code');
    await queryRunner.dropTable('event_type');
  }
}
