import {
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { Entity } from './decorator.js';

@Entity('weibo_posts_mentions')
export class WeiboPostMentionEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'post_id' })
  postId!: string;

  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'mentioned_id' })
  mentionedId!: string;

  @ManyToOne(() => WeiboPostEntity, (post) => post.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;
}
