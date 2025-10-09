import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTagTable1728385240000 implements MigrationInterface {
  name = 'CreateTagTable1728385240000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tag',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'tag_name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'tag_color',
            type: 'varchar',
            length: '20',
            default: "'#1890ff'",
            isNullable: false,
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
            isNullable: false,
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
      'tag',
      new TableIndex({
        name: 'IDX_tag_tag_name',
        columnNames: ['tag_name'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'tag',
      new TableIndex({
        name: 'IDX_tag_usage_count',
        columnNames: ['usage_count'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tag', 'IDX_tag_usage_count');
    await queryRunner.dropIndex('tag', 'IDX_tag_tag_name');
    await queryRunner.dropTable('tag');
  }
}
