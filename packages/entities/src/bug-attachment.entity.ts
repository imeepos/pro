import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BugEntity } from './bug.entity.js';
import { UserEntity } from './user.entity.js';
import { BugCommentEntity } from './bug-comment.entity.js';

@Entity('bug_attachments')
export class BugAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255, name: 'original_name' })
  originalName: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Index()
  @Column({ type: 'varchar', name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ type: 'varchar', nullable: true, name: 'bug_id' })
  bugId: string;

  @Column({ type: 'varchar', nullable: true, name: 'comment_id' })
  commentId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'uploaded_at' })
  uploadedAt: Date;

  // Relations
  @ManyToOne(() => BugEntity, (bug) => bug.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bug_id' })
  bug: BugEntity;

  @ManyToOne(() => BugCommentEntity, (comment) => comment.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment: BugCommentEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: UserEntity;
}