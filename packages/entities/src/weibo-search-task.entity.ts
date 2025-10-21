import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from './user.entity.js';
import { WeiboSubTaskEntity } from './weibo-sub-task.entity.js';

@Entity('weibo_search_tasks')
@Index(['enabled', 'nextRunAt'])
export class WeiboSearchTaskEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'latest_crawl_time', nullable: true })
  latestCrawlTime?: Date;

  @Column({ type: 'varchar', length: 20, name: 'crawl_interval' })
  crawlInterval: string;

  @Column({ type: 'timestamp', name: 'next_run_at', nullable: true })
  nextRunAt?: Date;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @OneToMany(() => WeiboSubTaskEntity, subTask => subTask.task, {
    cascade: ['remove'],
    eager: false,
  })
  subTasks?: WeiboSubTaskEntity[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
