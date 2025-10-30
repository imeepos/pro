import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Entity } from './decorator.js';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { WeiboPostEntity } from './weibo-post.entity.js';

@Entity('weibo_likes')
@Index(['targetWeiboId', 'userWeiboId'], { unique: true })
@Index(['targetWeiboId', 'createdAt'])
@Index(['userWeiboId', 'createdAt'])
export class WeiboLikeEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @ManyToOne(() => WeiboUserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  @RelationId((like: WeiboLikeEntity) => like.user)
  userId!: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'user_weibo_id',
  })
  userWeiboId!: string;

  @ManyToOne(() => WeiboPostEntity, (post) => post.interactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;

  @RelationId((like: WeiboLikeEntity) => like.post)
  postId!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'target_weibo_id',
  })
  targetWeiboId!: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;
}
