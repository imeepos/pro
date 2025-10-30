import {
  Check,
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Entity } from './decorator.js';
import {
  WeiboInteractionType,
  WeiboTargetType,
} from './enums/weibo.enums.js';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboCommentEntity } from './weibo-comment.entity.js';

@Entity('weibo_interactions')
@Index(['interactionType', 'userWeiboId', 'createdAt'])
@Check(
  `("target_type" = 'post' AND "target_post_id" IS NOT NULL AND "target_comment_id" IS NULL) OR ("target_type" = 'comment' AND "target_comment_id" IS NOT NULL)`,
)
export class WeiboInteractionEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id!: string;

  @Column({
    type: 'enum',
    enum: WeiboInteractionType,
    name: 'interaction_type',
    enumName: 'weibo_interaction_type_enum',
  })
  interactionType!: WeiboInteractionType;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 0,
    name: 'user_weibo_id',
    nullable: true,
  })
  userWeiboId!: string | null;

  @Column({ type: 'jsonb', name: 'user_info_snapshot' })
  userInfoSnapshot!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: WeiboTargetType,
    name: 'target_type',
    enumName: 'weibo_target_type_enum',
  })
  targetType!: WeiboTargetType;

  @ManyToOne(() => WeiboPostEntity, (post) => post.interactions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'target_post_id' })
  post!: WeiboPostEntity | null;

  @RelationId((interaction: WeiboInteractionEntity) => interaction.post)
  targetPostId!: string | null;

  @ManyToOne(() => WeiboCommentEntity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'target_comment_id' })
  comment!: WeiboCommentEntity | null;

  @RelationId((interaction: WeiboInteractionEntity) => interaction.comment)
  targetCommentId!: string | null;

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

  @Column({ type: 'smallint', name: 'attitude_value', nullable: true })
  attitudeValue!: number | null;

  @Column({ type: 'jsonb', name: 'metadata_json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload!: Record<string, unknown>;
}
