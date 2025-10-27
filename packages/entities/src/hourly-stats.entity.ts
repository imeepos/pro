import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Entity } from './decorator.js';
@Entity('hourly_stats')
@Index(['keyword', 'hourTimestamp'], { unique: true })
export class HourlyStatsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  keyword: string;

  @Column('timestamp')
  hourTimestamp: Date;

  @Column({ type: 'int', default: 0 })
  postCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  positiveCount: number;

  @Column({ type: 'int', default: 0 })
  neutralCount: number;

  @Column({ type: 'int', default: 0 })
  negativeCount: number;

  @Column('float', { default: 0.0 })
  avgSentimentScore: number;

  @Column('jsonb', { nullable: true })
  topKeywords: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
