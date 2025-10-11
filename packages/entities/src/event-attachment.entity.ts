import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventEntity } from './event.entity.js';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

@Entity('event_attachment')
export class EventAttachmentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index()
  @Column({ type: 'bigint', name: 'event_id' })
  eventId: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 500, name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 100, name: 'bucket_name' })
  bucketName: string;

  @Column({ type: 'varchar', length: 500, name: 'object_name' })
  objectName: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'file_type',
  })
  fileType: FileType;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mime_type' })
  mimeType: string;

  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'file_md5' })
  fileMd5: string;

  @Index()
  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EventEntity, (event) => event.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;
}
