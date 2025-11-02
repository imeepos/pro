import {
  PrimaryColumn,
} from 'typeorm';
import { Entity } from './decorator.js';

@Entity('weibo_posts_mentions')
export class WeiboPostMentionEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'post_id' })
  postId!: string;

  @PrimaryColumn({ type: 'bigint', unsigned: true, name: 'mentioned_id' })
  mentionedId!: string;
}
