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

@Entity('bug_watchers')
export class BugWatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'bug_id' })
  bugId: string;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => BugEntity, (bug) => bug.watchers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bug_id' })
  bug: BugEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}