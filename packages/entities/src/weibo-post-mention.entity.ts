import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboUserEntity } from './weibo-user.entity.js';

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

  @ManyToOne(() => WeiboUserEntity, (user) => user.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mentioned_id' })
  mentionedUser!: WeiboUserEntity;
}
