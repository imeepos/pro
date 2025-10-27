import {
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { WeiboMediaType } from './enums/weibo.enums.js';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { Entity } from './decorator.js';

@Entity('weibo_media')
export class WeiboMediaEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @ManyToOne(() => WeiboPostEntity, (post) => post.media, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;

  @RelationId((media: WeiboMediaEntity) => media.post)
  postId!: string;

  @Column({ type: 'varchar', length: 128, name: 'media_id' })
  mediaId!: string;

  @Column({
    type: 'enum',
    enum: WeiboMediaType,
    name: 'media_type',
    enumName: 'weibo_media_type_enum',
  })
  mediaType!: WeiboMediaType;

  @Column({ type: 'text', name: 'file_url' })
  fileUrl!: string;

  @Column({ type: 'text', name: 'original_url', nullable: true })
  originalUrl!: string | null;

  @Column({ type: 'integer', nullable: true })
  width!: number | null;

  @Column({ type: 'integer', nullable: true })
  height!: number | null;

  @Column({ type: 'integer', name: 'file_size', nullable: true })
  fileSize!: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  format!: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnail!: string | null;

  @Column({ type: 'text', nullable: true })
  bmiddle!: string | null;

  @Column({ type: 'text', nullable: true })
  large!: string | null;

  @Column({ type: 'text', nullable: true })
  original!: string | null;

  @Column({ type: 'integer', nullable: true })
  duration!: number | null;

  @Column({ type: 'text', name: 'stream_url', nullable: true })
  streamUrl!: string | null;

  @Column({ type: 'text', name: 'stream_url_hd', nullable: true })
  streamUrlHd!: string | null;

  @Column({ type: 'jsonb', name: 'media_info_json', nullable: true })
  mediaInfoJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;
}
