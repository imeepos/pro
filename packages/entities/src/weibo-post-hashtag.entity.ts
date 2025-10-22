import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboHashtagEntity } from './weibo-hashtag.entity.js';

@Entity('weibo_posts_hashtags')
export class WeiboPostHashtagEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'post_id' })
  postId!: string;

  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'hashtag_id' })
  hashtagId!: string;

  @ManyToOne(() => WeiboPostEntity, (post) => post.hashtags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;

  @ManyToOne(() => WeiboHashtagEntity, (hashtag) => hashtag.postLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'hashtag_id' })
  hashtag!: WeiboHashtagEntity;
}
