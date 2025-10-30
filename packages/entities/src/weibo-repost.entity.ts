import {
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Entity } from './decorator.js';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { WeiboPostEntity } from './weibo-post.entity.js';

@Entity('weibo_reposts')
@Index(['targetWeiboId'], { unique: true })
@Index(['userWeiboId', 'createdAt'])
export class WeiboRepostEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @ManyToOne(() => WeiboUserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  @RelationId((repost: WeiboRepostEntity) => repost.user)
  userId!: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'user_weibo_id',
  })
  userWeiboId!: string;

  @ManyToOne(() => WeiboPostEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;

  @RelationId((repost: WeiboRepostEntity) => repost.post)
  postId!: string;

  @ManyToOne(() => WeiboPostEntity, { nullable: true })
  @JoinColumn({ name: 'original_post_id' })
  originalPost!: WeiboPostEntity | null;

  @RelationId((repost: WeiboRepostEntity) => repost.originalPost)
  originalPostId!: string | null;

  @Column({ type: 'text', nullable: true, name: 'repost_text' })
  repostText!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'repost_pic_ids' })
  repostPicIds!: string[] | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'target_weibo_id',
  })
  targetWeiboId!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;
}
