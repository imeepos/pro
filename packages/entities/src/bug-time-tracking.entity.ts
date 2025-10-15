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

@Entity('bug_time_tracking')
export class BugTimeTrackingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'bug_id' })
  bugId: string;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'user_name' })
  userName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  hours: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Index()
  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => BugEntity, (bug) => bug.timeTracking, {
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