import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('hourly_stats')
@Index(['keyword', 'hourTimestamp'], { unique: true })
export class HourlyStatsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  keyword: string;

  @Column('timestamp')
  hourTimestamp: Date;

  @Column({ default: 0 })
  postCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  positiveCount: number;

  @Column({ default: 0 })
  neutralCount: number;

  @Column({ default: 0 })
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
