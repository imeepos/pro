import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator.js';

@Entity('weibo_user_stats')
export class WeiboUserStatsEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'timestamptz', name: 'snapshot_time' })
  snapshotTime!: Date;

  @Column({ type: 'integer', nullable: true })
  followers!: number | null;

  @Column({ type: 'integer', nullable: true })
  following!: number | null;

  @Column({ type: 'integer', nullable: true })
  statuses!: number | null;

  @Column({ type: 'integer', nullable: true })
  likes!: number | null;

  @Column({ type: 'varchar', length: 64, name: 'data_source' })
  dataSource!: string;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, name: 'version_tag', nullable: true })
  versionTag!: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ingestedAt!: Date;
}
