import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('daily_stats')
@Index(['keyword', 'date'], { unique: true })
export class DailyStatsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  keyword: string;

  @Column('date')
  date: Date;

  @Column({ default: 0 })
  totalPostCount: number;

  @Column({ default: 0 })
  totalCommentCount: number;

  @Column('jsonb', { nullable: true })
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @Column({ default: 0 })
  activeUserCount: number;

  @Column('jsonb', { nullable: true })
  topKeywords: string[];

  @Column('jsonb', { nullable: true })
  hourlyBreakdown: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
