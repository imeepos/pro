import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WeiboSearchTaskEntity } from './weibo-search-task.entity.js';

export interface WeiboSubTaskMetadata {
  startTime?: string | Date;
  endTime?: string | Date;
  keyword?: string;
  [key: string]: unknown;
}

@Entity('weibo_sub_tasks')
@Index(['taskId', 'status'])
@Index(['type', 'status'])
export class WeiboSubTaskEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'task_id' })
  taskId: number;

  @ManyToOne(() => WeiboSearchTaskEntity, task => task.subTasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: WeiboSearchTaskEntity;

  @Column({
    type: 'jsonb',
    default: () => "'{}'",
  })
  metadata: WeiboSubTaskMetadata;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
