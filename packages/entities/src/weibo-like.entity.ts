import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from './decorator.js';

@Entity('weibo_likes')
@Index(['targetWeiboId', 'userWeiboId'], { unique: true })
@Index(['targetWeiboId', 'createdAt'])
@Index(['userWeiboId', 'createdAt'])
export class WeiboLikeEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'user_weibo_id',
  })
  userWeiboId!: string;

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
