import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Entity } from './decorator.js';

@Entity('failed_tasks')
@Index(['originalQueue', 'status'])
@Index(['failedAt'])
export class FailedTaskEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 200, name: 'original_queue' })
  originalQueue: string;

  @Column({ type: 'text', name: 'message_body' })
  messageBody: string;

  @Column({ type: 'int', default: 0, name: 'failure_count' })
  failureCount: number;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'failed_at' })
  failedAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending_review',
  })
  status: 'pending_review' | 'retried' | 'ignored';

  @Column({ type: 'timestamp', nullable: true, name: 'retried_at' })
  retriedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'retried_by' })
  retriedBy?: string;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
