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

export enum BugNotificationType {
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  COMMENT_ADDED = 'comment_added',
  MENTION = 'mention',
  DUE_DATE_REMINDER = 'due_date_reminder',
  BUG_RESOLVED = 'bug_resolved',
  BUG_CLOSED = 'bug_closed',
  BUG_REOPENED = 'bug_reopened'
}

@Entity('bug_notifications')
export class BugNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'varchar', name: 'bug_id' })
  bugId: string;

  @Column({
    type: 'enum',
    enum: BugNotificationType,
  })
  type: BugNotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => BugEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bug_id' })
  bug: BugEntity;
}