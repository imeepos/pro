import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateIndustryTypeTable1728385200000 implements MigrationInterface {
  name = 'CreateIndustryTypeTable1728385200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'industry_type',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'industry_code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'industry_name',
            type: 'varchar',
            length: '100',
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
      'industry_type',
      new TableIndex({
        name: 'IDX_industry_type_industry_code',
        columnNames: ['industry_code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'industry_type',
      new TableIndex({
        name: 'IDX_industry_type_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('industry_type', 'IDX_industry_type_status');
    await queryRunner.dropIndex('industry_type', 'IDX_industry_type_industry_code');
    await queryRunner.dropTable('industry_type');
  }
}
