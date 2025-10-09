import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEventTagTable1728385250000 implements MigrationInterface {
  name = 'CreateEventTagTable1728385250000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_tag',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'event_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'tag_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'event_tag',
      new TableIndex({
        name: 'IDX_event_tag_unique',
        columnNames: ['event_id', 'tag_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'event_tag',
      new TableIndex({
        name: 'IDX_event_tag_tag_id',
        columnNames: ['tag_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'event_tag',
      new TableForeignKey({
        name: 'FK_event_tag_event_id',
        columnNames: ['event_id'],
        referencedTableName: 'event',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'event_tag',
      new TableForeignKey({
        name: 'FK_event_tag_tag_id',
        columnNames: ['tag_id'],
        referencedTableName: 'tag',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('event_tag', 'FK_event_tag_tag_id');
    await queryRunner.dropForeignKey('event_tag', 'FK_event_tag_event_id');
    await queryRunner.dropIndex('event_tag', 'IDX_event_tag_tag_id');
    await queryRunner.dropIndex('event_tag', 'IDX_event_tag_unique');
    await queryRunner.dropTable('event_tag');
  }
}
