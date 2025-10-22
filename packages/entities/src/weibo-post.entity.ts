import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { WeiboVisibleType } from './enums/weibo.enums.js';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { WeiboMediaEntity } from './weibo-media.entity.js';
import { WeiboPostHashtagEntity } from './weibo-post-hashtag.entity.js';
import { WeiboPostMentionEntity } from './weibo-post-mention.entity.js';
import { WeiboCommentEntity } from './weibo-comment.entity.js';
import { WeiboInteractionEntity } from './weibo-interaction.entity.js';

@Entity('weibo_posts')
@Index(['weiboId'], { unique: true })
@Index(['mid'], { unique: true })
@Index(['mblogId'], { unique: true })
@Index(['createdAt'])
@Index(['authorWeiboId'])
@Index(['authorWeiboId', 'createdAt'])
@Index(['mblogtype', 'createdAt'])
export class WeiboPostEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'weibo_id',
  })
  weiboId!: string;

  @Column({ type: 'varchar', length: 64, name: 'mid' })
  mid!: string;

  @Column({ type: 'varchar', length: 64, name: 'mblogid' })
  mblogId!: string;

  @ManyToOne(() => WeiboUserEntity, (user) => user.posts, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  author!: WeiboUserEntity;

  @RelationId((post: WeiboPostEntity) => post.author)
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

  @Column({ type: 'text', name: 'author_avatar', nullable: true })
  authorAvatar!: string | null;

  @Column({ type: 'text', name: 'author_verified_info', nullable: true })
  authorVerifiedInfo!: string | null;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'text', name: 'text_raw', nullable: true })
  textRaw!: string | null;

  @Column({ type: 'integer', name: 'text_length', default: 0 })
  textLength!: number;

  @Column({ type: 'boolean', name: 'is_long_text', default: false })
  isLongText!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'content_auth' })
  contentAuth!: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({
    type: 'integer',
    name: 'reposts_count',
    default: 0,
  })
  repostsCount!: number;

  @Column({
    type: 'integer',
    name: 'comments_count',
    default: 0,
  })
  commentsCount!: number;

  @Column({
    type: 'integer',
    name: 'attitudes_count',
    default: 0,
  })
  attitudesCount!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'region_name' })
  regionName!: string | null;

  @Column({ type: 'smallint', nullable: true, name: 'pic_num' })
  picNum!: number | null;

  @Column({ type: 'boolean', name: 'is_paid', default: false })
  isPaid!: boolean;

  @Column({ type: 'smallint', nullable: true, name: 'mblog_vip_type' })
  mblogVipType!: number | null;

  @Column({ type: 'boolean', name: 'can_edit', default: false })
  canEdit!: boolean;

  @Column({ type: 'boolean', default: false })
  favorited!: boolean;

  @Column({ type: 'smallint', name: 'mblogtype' })
  mblogtype!: number;

  @Column({ type: 'boolean', name: 'is_repost', default: false })
  isRepost!: boolean;

  @Column({ type: 'smallint', nullable: true, name: 'share_repost_type' })
  shareRepostType!: number | null;

  @Column({
    type: 'enum',
    enum: WeiboVisibleType,
    name: 'visible_type',
    nullable: true,
  })
  visibleType!: WeiboVisibleType | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'visible_list_id',
    nullable: true,
  })
  visibleListId!: string | null;

  @Column({ type: 'jsonb', name: 'location_json', nullable: true })
  locationJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'page_info_json', nullable: true })
  pageInfoJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'action_log_json', nullable: true })
  actionLogJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'analysis_extra', nullable: true })
  analysisExtra!: Record<string, unknown> | null;

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

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt!: Date | null;

  @OneToMany(() => WeiboMediaEntity, (media) => media.post, {
    cascade: true,
  })
  media!: WeiboMediaEntity[];

  @OneToMany(() => WeiboPostHashtagEntity, (hashtag) => hashtag.post, {
    cascade: true,
  })
  hashtags!: WeiboPostHashtagEntity[];

  @OneToMany(() => WeiboPostMentionEntity, (mention) => mention.post, {
    cascade: true,
  })
  mentions!: WeiboPostMentionEntity[];

  @OneToMany(() => WeiboCommentEntity, (comment) => comment.post)
  comments!: WeiboCommentEntity[];

  @OneToMany(() => WeiboInteractionEntity, (interaction) => interaction.post)
  interactions!: WeiboInteractionEntity[];
}
