import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { Entity } from './decorator.js';

@Entity('weibo_user_stats')
@Index(['user', 'snapshotTime'], { unique: true })
export class WeiboUserStatsEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @ManyToOne(() => WeiboUserEntity, (user) => user.statSnapshots, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity;

  @RelationId((stats: WeiboUserStatsEntity) => stats.user)
  userId!: string;

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
