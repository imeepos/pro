import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { WeiboInteractionEntity } from './weibo-interaction.entity.js';

@Entity('weibo_comments')
@Index(['commentId'], { unique: true })
@Index(['mid'], { unique: true })
@Index(['postId', 'path'])
@Index(['createdAt'])
export class WeiboCommentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'comment_id',
  })
  commentId!: string;

  @Column({ type: 'varchar', length: 64, name: 'idstr' })
  idstr!: string;

  @Column({ type: 'varchar', length: 64, name: 'mid' })
  mid!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'root_id',
    nullable: true,
  })
  rootId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'root_mid', nullable: true })
  rootMid!: string | null;

  @ManyToOne(() => WeiboPostEntity, (post) => post.comments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post!: WeiboPostEntity;

  @RelationId((comment: WeiboCommentEntity) => comment.post)
  postId!: string;

  @ManyToOne(() => WeiboUserEntity, (user) => user.comments, {
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  author!: WeiboUserEntity;

  @RelationId((comment: WeiboCommentEntity) => comment.author)
  authorId!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'author_weibo_id',
  })
  authorWeiboId!: string;

  @Column({ type: 'varchar', length: 64, name: 'author_nickname', nullable: true })
  authorNickname!: string | null;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', name: 'text_raw', nullable: true })
  textRaw!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source!: string | null;

  @Column({ type: 'integer', name: 'floor_number', nullable: true })
  floorNumber!: number | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({
    type: 'integer',
    name: 'like_counts',
    default: 0,
  })
  likeCounts!: number;

  @Column({ type: 'boolean', default: false })
  liked!: boolean;

  @Column({ type: 'integer', name: 'total_number', nullable: true })
  totalNumber!: number | null;

  @Column({ type: 'boolean', name: 'disable_reply', default: false })
  disableReply!: boolean;

  @Column({ type: 'boolean', name: 'restrict_operate', default: false })
  restrictOperate!: boolean;

  @Column({ type: 'boolean', name: 'allow_follow', default: true })
  allowFollow!: boolean;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'reply_comment_id',
    nullable: true,
  })
  replyCommentId!: string | null;

  @Column({ type: 'text', name: 'reply_original_text', nullable: true })
  replyOriginalText!: string | null;

  @Column({ type: 'boolean', name: 'is_mblog_author', default: false })
  isMblogAuthor!: boolean;

  @Column({ type: 'jsonb', name: 'comment_badge', nullable: true })
  commentBadge!: Record<string, unknown> | null;

  @Column({ type: 'ltree' })
  path!: string;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ingestedAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany(() => WeiboInteractionEntity, (interaction) => interaction.comment)
  interactions!: WeiboInteractionEntity[];

  get content(): string {
    return this.text;
  }

  set content(value: string) {
    this.text = value;
  }

  get likeCount(): number {
    return this.likeCounts;
  }

  set likeCount(value: number) {
    this.likeCounts = value ?? 0;
  }

  get replyToCommentId(): string | null {
    return this.replyCommentId ?? null;
  }

  set replyToCommentId(value: string | null) {
    this.replyCommentId = value ?? null;
  }

  get publishedAt(): Date {
    return this.createdAt;
  }

  set publishedAt(value: Date) {
    this.createdAt = value;
  }
}
