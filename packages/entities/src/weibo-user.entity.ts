import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboCommentEntity } from './weibo-comment.entity.js';
import { WeiboInteractionEntity } from './weibo-interaction.entity.js';
import { WeiboUserStatsEntity } from './weibo-user-stats.entity.js';
import { WeiboPostMentionEntity } from './weibo-post-mention.entity.js';

@Entity('weibo_users')
@Index(['weiboId'], { unique: true })
export class WeiboUserEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'weibo_id',
  })
  weiboId!: string;

  @Column({ type: 'varchar', length: 32, name: 'idstr' })
  idstr!: string;

  @Column({ type: 'varchar', length: 64, name: 'screen_name' })
  screenName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  domain!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  weihao!: string | null;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Column({ type: 'smallint', nullable: true, name: 'verified_type' })
  verifiedType!: number | null;

  @Column({ type: 'text', nullable: true, name: 'verified_reason' })
  verifiedReason!: string | null;

  @Column({ type: 'integer', nullable: true, name: 'verified_type_ext' })
  verifiedTypeExt!: number | null;

  @Column({ type: 'text', nullable: true, name: 'profile_image_url' })
  profileImageUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'avatar_large' })
  avatarLarge!: string | null;

  @Column({ type: 'text', nullable: true, name: 'avatar_hd' })
  avatarHd!: string | null;

  @Column({
    type: 'integer',
    default: 0,
    name: 'followers_count',
  })
  followersCount!: number;

  @Column({
    type: 'integer',
    default: 0,
    name: 'friends_count',
  })
  friendsCount!: number;

  @Column({
    type: 'integer',
    default: 0,
    name: 'statuses_count',
  })
  statusesCount!: number;

  @Column({ type: 'smallint', nullable: true })
  mbrank!: number | null;

  @Column({ type: 'smallint', nullable: true })
  mbtype!: number | null;

  @Column({ type: 'boolean', default: false, name: 'v_plus' })
  vPlus!: boolean;

  @Column({ type: 'boolean', default: false })
  svip!: boolean;

  @Column({ type: 'boolean', default: false })
  vvip!: boolean;

  @Column({
    type: 'integer',
    array: true,
    nullable: true,
    name: 'user_ability',
  })
  userAbility!: number[] | null;

  @Column({ type: 'boolean', default: false, name: 'planet_video' })
  planetVideo!: boolean;

  @Column({ type: 'char', length: 1, nullable: true })
  gender!: 'm' | 'f' | 'n' | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: false, name: 'follow_me' })
  followMe!: boolean;

  @Column({ type: 'boolean', default: false })
  following!: boolean;

  @Column({ type: 'smallint', nullable: true, name: 'online_status' })
  onlineStatus!: number | null;

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

  @OneToMany(() => WeiboPostEntity, (post) => post.author)
  posts!: WeiboPostEntity[];

  @OneToMany(() => WeiboCommentEntity, (comment) => comment.author)
  comments!: WeiboCommentEntity[];

  @OneToMany(() => WeiboInteractionEntity, (interaction) => interaction.user)
  interactions!: WeiboInteractionEntity[];

  @OneToMany(() => WeiboUserStatsEntity, (stats) => stats.user)
  statSnapshots!: WeiboUserStatsEntity[];

  @OneToMany(() => WeiboPostMentionEntity, (mention) => mention.mentionedUser)
  mentions!: WeiboPostMentionEntity[];
}
