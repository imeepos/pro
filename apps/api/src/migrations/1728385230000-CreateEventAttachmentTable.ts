import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEventAttachmentTable1728385230000 implements MigrationInterface {
  name = 'CreateEventAttachmentTable1728385230000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_attachment',
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
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'bucket_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'object_name',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '文件类型(image/video/document)',
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'sort_order',
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'event_attachment',
      new TableIndex({
        name: 'IDX_event_attachment_event_id_sort',
        columnNames: ['event_id', 'sort_order'],
      }),
    );

    await queryRunner.createForeignKey(
      'event_attachment',
      new TableForeignKey({
        name: 'FK_event_attachment_event_id',
        columnNames: ['event_id'],
        referencedTableName: 'event',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('event_attachment', 'FK_event_attachment_event_id');
    await queryRunner.dropIndex('event_attachment', 'IDX_event_attachment_event_id_sort');
    await queryRunner.dropTable('event_attachment');
  }
}
