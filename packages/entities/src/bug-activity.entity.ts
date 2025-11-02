import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BugEntity } from './bug.entity.js';
import { UserEntity } from './user.entity.js';
import { BugActivityAction } from '@pro/types';
import { Entity } from './decorator.js';

@Entity('bug_activities')
export class BugActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'bug_id' })
  bugId: string;

  @Column({
    type: 'enum',
    enum: BugActivityAction,
  })
  action: BugActivityAction;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'user_name' })
  userName: string;

  @Column({ type: 'json', nullable: true })
  oldValue: any;

  @Column({ type: 'json', nullable: true })
  newValue: any;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => BugEntity, (bug) => bug.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bug_id' })
  bug: BugEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}