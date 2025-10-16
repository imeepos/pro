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
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserEntity } from './user.entity.js';
import { BugAttachmentEntity } from './bug-attachment.entity.js';
import { BugCommentEntity } from './bug-comment.entity.js';
import { BugTagEntity } from './bug-tag.entity.js';
import { BugWatchEntity } from './bug-watch.entity.js';
import { BugActivityEntity } from './bug-activity.entity.js';
import { BugTimeTrackingEntity } from './bug-time-tracking.entity.js';
import { BugStatus, BugPriority, BugCategory } from '@pro/types';

@Entity('bugs')
export class BugEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: BugStatus,
    default: BugStatus.OPEN,
  })
  status: BugStatus;

  @Index()
  @Column({
    type: 'enum',
    enum: BugPriority,
    default: BugPriority.MEDIUM,
  })
  priority: BugPriority;

  @Index()
  @Column({
    type: 'enum',
    enum: BugCategory,
    default: BugCategory.FUNCTIONAL,
  })
  category: BugCategory;

  @Index()
  @Column({ type: 'varchar', nullable: true, name: 'reporter_id' })
  reporterId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true, name: 'assignee_id' })
  assigneeId: string;

  @Column({ type: 'json', nullable: true })
  environment: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'steps_to_reproduce' })
  stepsToReproduce: string;

  @Column({ type: 'text', nullable: true, name: 'expected_behavior' })
  expectedBehavior: string;

  @Column({ type: 'text', nullable: true, name: 'actual_behavior' })
  actualBehavior: string;

  @Column({
    type: 'enum',
    enum: ['always', 'sometimes', 'rarely'],
    nullable: true,
    name: 'reproduction_rate'
  })
  reproductionRate: 'always' | 'sometimes' | 'rarely';

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'resolved_by' })
  resolvedBy: string;

  @Column({ type: 'timestamp', nullable: true, name: 'closed_at' })
  closedAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'closed_by' })
  closedBy: string;

  @Index()
  @Column({ type: 'timestamp', nullable: true, name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'estimated_hours' })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'actual_hours' })
  actualHours: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, (user) => user.reportedBugs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reporter_id' })
  reporter: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.assignedBugs, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'closed_by' })
  closer: UserEntity;

  @OneToMany(() => BugAttachmentEntity, (attachment) => attachment.bug, {
    cascade: true,
  })
  attachments: BugAttachmentEntity[];

  @OneToMany(() => BugCommentEntity, (comment) => comment.bug, {
    cascade: true,
  })
  comments: BugCommentEntity[];

  @ManyToMany(() => BugTagEntity, (tag) => tag.bugs, {
    cascade: true,
  })
  @JoinTable({
    name: 'bug_tags_relation',
    joinColumn: { name: 'bug_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: BugTagEntity[];

  @OneToMany(() => BugWatchEntity, (watch) => watch.bug, {
    cascade: true,
  })
  watchers: BugWatchEntity[];

  @OneToMany(() => BugActivityEntity, (activity) => activity.bug, {
    cascade: true,
  })
  activities: BugActivityEntity[];

  @OneToMany(() => BugTimeTrackingEntity, (timeTracking) => timeTracking.bug, {
    cascade: true,
  })
  timeTracking: BugTimeTrackingEntity[];
}