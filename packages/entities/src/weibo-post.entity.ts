import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('weibo_posts')
@Index(['weiboId'], { unique: true })
@Index(['publishedAt'])
@Index(['authorWeiboId'])
export class WeiboPostEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'weibo_id' })
  weiboId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, name: 'author_weibo_id' })
  authorWeiboId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'author_nickname' })
  authorNickname: string | null;

  @Column({ type: 'jsonb', nullable: true })
  images: string[] | null;

  @Column({ type: 'timestamp', name: 'published_at' })
  publishedAt: Date;

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'int', default: 0, name: 'comment_count' })
  commentCount: number;

  @Column({ type: 'int', default: 0, name: 'share_count' })
  shareCount: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null;

  @Column({ type: 'jsonb', nullable: true })
  hashtags: string[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_repost' })
  isRepost: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'repost_weibo_id' })
  repostWeiboId: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
