import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator.js';

@Entity('weibo_comments')
@Index(['id'], { unique: true })
@Index(['mid'], { unique: true })
export class WeiboCommentEntity {

  @Column({ type: 'varchar', length: 64, nullable: true })
  created_at!: string;

  @PrimaryColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint', nullable: true })
  rootid!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rootidstr!: string;

  @Column({ type: 'integer', nullable: true })
  floor_number!: number;

  @Column({ type: 'text', nullable: true })
  text!: string;

  @Column({ type: 'integer', nullable: true })
  disable_reply!: number;

  @Column({ type: 'integer', nullable: true })
  restrictOperate!: number;

  @Column({ type: 'integer', nullable: true })
  source_allowclick!: number;

  @Column({ type: 'integer', nullable: true })
  source_type!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source!: string;

  @Column({ type: 'jsonb', nullable: true })
  user!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mid!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  idstr!: string;

  @Column({ type: 'boolean', nullable: true })
  liked!: boolean;

  @Column({ type: 'integer', nullable: true })
  pic_num!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  readtimetype!: string;

  @Column({ type: 'text', nullable: true })
  analysis_extra!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cmt_ext!: string;

  @Column({ type: 'boolean', nullable: true })
  match_ai_play_picture!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  rid!: string;

  @Column({ type: 'boolean', nullable: true })
  allow_follow!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  item_category!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  degrade_type!: string;

  @Column({ type: 'text', nullable: true })
  report_scheme!: string;

  @Column({ type: 'integer', nullable: true })
  from_repost_type!: number;

  @Column({ type: 'jsonb', nullable: true })
  comments!: unknown[];

  @Column({ type: 'bigint', nullable: true })
  max_id!: number;

  @Column({ type: 'integer', nullable: true })
  total_number!: number;

  @Column({ type: 'boolean', nullable: true })
  isLikedByMblogAuthor!: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  status_exempt_url_block!: string;

  @Column({ type: 'jsonb', nullable: true })
  url_struct!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  topic_struct!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  comment_bubble!: Record<string, unknown>;

  @Column({ type: 'integer', nullable: true })
  like_counts!: number;

  @Column({ type: 'jsonb', nullable: true })
  more_info!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  text_raw!: string;

  @Column({ type: 'boolean', nullable: true })
  isExpand!: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ingestedAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
