import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddFileMd5ToEventAttachment1760070662000 implements MigrationInterface {
  name = 'AddFileMd5ToEventAttachment1760070662000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'event_attachment',
      new TableColumn({
        name: 'file_md5',
        type: 'varchar',
        length: '32',
        isNullable: true,
        comment: '文件 MD5 哈希值，用于去重',
      }),
    );

    await queryRunner.createIndex(
      'event_attachment',
      new TableIndex({
        name: 'idx_event_attachment_md5',
        columnNames: ['file_md5'],
        isUnique: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('event_attachment', 'idx_event_attachment_md5');
    await queryRunner.dropColumn('event_attachment', 'file_md5');
  }
}
