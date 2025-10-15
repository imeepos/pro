import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('attachment_upload_tokens')
export class AttachmentUploadTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'event_id' })
  eventId: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', length: 32, name: 'file_md5' })
  fileMd5: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, name: 'object_name' })
  objectName: string;

  @Column({ type: 'varchar', length: 100, name: 'bucket_name' })
  bucketName: string;

  @Column({ type: 'boolean', name: 'requires_upload', default: true })
  requiresUpload: boolean;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
