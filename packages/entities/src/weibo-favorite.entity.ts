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

@Entity('weibo_favorites')
@Index(['targetWeiboId', 'userWeiboId'], { unique: true })
@Index(['userWeiboId', 'folderName', 'createdAt'])
@Index(['targetWeiboId', 'createdAt'])
export class WeiboFavoriteEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @ManyToOne(() => WeiboUserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: WeiboUserEntity | null;

  @RelationId((favorite: WeiboFavoriteEntity) => favorite.user)
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

  @RelationId((favorite: WeiboFavoriteEntity) => favorite.post)
  postId!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'target_weibo_id',
  })
  targetWeiboId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'folder_name' })
  folderName!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata_json' })
  metadataJson!: Record<string, unknown> | null;
}
