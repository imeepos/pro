import {
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WeiboPostHashtagEntity } from './weibo-post-hashtag.entity.js';
import { Entity } from './decorator.js';

@Entity('weibo_hashtags')
@Index(['tagId'], { unique: true })
@Index(['tagName'])
export class WeiboHashtagEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 128, name: 'tag_id' })
  tagId!: string;

  @Column({ type: 'varchar', length: 128, name: 'tag_name' })
  tagName!: string;

  @Column({ type: 'smallint', name: 'tag_type', nullable: true })
  tagType!: number | null;

  @Column({ type: 'boolean', name: 'tag_hidden', default: false })
  tagHidden!: boolean;

  @Column({ type: 'varchar', length: 128, name: 'oid', nullable: true })
  oid!: string | null;

  @Column({ type: 'text', name: 'tag_scheme', nullable: true })
  tagScheme!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', name: 'url_type_pic', nullable: true })
  urlTypePic!: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 3, name: 'w_h_ratio', nullable: true })
  wHRatio!: string | null;

  @Column({ type: 'jsonb', name: 'action_log_json', nullable: true })
  actionLogJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ingestedAt!: Date;

  @OneToMany(() => WeiboPostHashtagEntity, (link) => link.hashtag)
  postLinks!: WeiboPostHashtagEntity[];
}
