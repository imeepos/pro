import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('weibo_comments')
@Index(['commentId'], { unique: true })
@Index(['postWeiboId'])
@Index(['publishedAt'])
export class WeiboCommentEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'comment_id' })
  commentId: string;

  @Column({ type: 'varchar', length: 50, name: 'post_weibo_id' })
  postWeiboId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, name: 'author_weibo_id' })
  authorWeiboId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'author_nickname' })
  authorNickname: string | null;

  @Column({ type: 'timestamp', name: 'published_at' })
  publishedAt: Date;

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'reply_to_comment_id' })
  replyToCommentId: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
