import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BugEntity } from './bug.entity.js';
import { UserEntity } from './user.entity.js';
import { BugAttachmentEntity } from './bug-attachment.entity.js';

@Entity('bug_comments')
export class BugCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'bug_id' })
  bugId: string;

  @Column({ type: 'text' })
  content: string;

  @Index()
  @Column({ type: 'varchar', name: 'author_id' })
  authorId: string;

  @Column({ type: 'varchar', length: 100, name: 'author_name' })
  authorName: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_edited' })
  isEdited: boolean;

  // Relations
  @ManyToOne(() => BugEntity, (bug) => bug.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bug_id' })
  bug: BugEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @OneToMany(() => BugAttachmentEntity, (attachment) => attachment.comment, {
    cascade: true,
  })
  attachments: BugAttachmentEntity[];
}