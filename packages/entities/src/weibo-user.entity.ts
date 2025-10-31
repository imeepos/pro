import { Column, Index, PrimaryColumn } from 'typeorm';
import { Entity } from './decorator.js';
import { booleanToSmallintTransformer } from './transformers/boolean-to-smallint.transformer.js';
@Entity('weibo_users')
@Index(['id'], { unique: true })
export class WeiboUserEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  idstr!: string | null;

  @Column({ type: 'smallint', default: 1, nullable: true, transformer: booleanToSmallintTransformer })
  class!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  screen_name!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  province!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @Column({ type: 'text', nullable: true })
  profile_image_url!: string | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  light_ring!: boolean | null;

  @Column({ type: 'text', nullable: true })
  cover_image_phone!: string | null;

  @Column({ type: 'text', nullable: true })
  profile_url!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  domain!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  weihao!: string | null;

  @Column({ type: 'char', length: 1, default: 'n', nullable: true })
  gender!: string | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  followers_count!: number | null;

  @Column({ type: 'varchar', length: 32, default: '0', nullable: true })
  followers_count_str!: string | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  friends_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  pagefriends_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  statuses_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  video_status_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  video_play_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  v_plus!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  super_topic_not_syn_count!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  favourites_count!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  created_at!: string | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  following!: boolean | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  allow_all_act_msg!: boolean | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  geo_enabled!: boolean | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  verified!: boolean | null;

  @Column({ type: 'smallint', default: -1, nullable: true, transformer: booleanToSmallintTransformer })
  verified_type!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  insecurity!: Record<string, unknown> | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  ptype!: number | null;

  @Column({ type: 'boolean', default: true, nullable: true })
  allow_all_comment!: boolean | null;

  @Column({ type: 'text', nullable: true })
  avatar_large!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_hd!: string | null;

  @Column({ type: 'text', nullable: true })
  verified_reason!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  verified_trade!: string | null;

  @Column({ type: 'text', nullable: true })
  verified_reason_url!: string | null;

  @Column({ type: 'text', nullable: true })
  verified_source!: string | null;

  @Column({ type: 'text', nullable: true })
  verified_source_url!: string | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  follow_me!: boolean | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  like!: boolean | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  like_me!: boolean | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  online_status!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  bi_followers_count!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'zh-cn', nullable: true })
  lang!: string | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  star!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  mbtype!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  mbrank!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  svip!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  vvip!: number | null;

  @Column({ type: 'bigint', default: 0, nullable: true })
  mb_expire_time!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  block_word!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  block_app!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  chaohua_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  brand_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  nft_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  vplus_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  wenda_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  live_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  gongyi_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  paycolumn_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  newbrand_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  ecommerce_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  hardfan_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  wbcolumn_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  interaction_user!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  audio_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  place_ability!: number | null;

  @Column({ type: 'integer', default: 0, nullable: true })
  credit_score!: number | null;

  @Column({ type: 'bigint', default: 0, nullable: true })
  user_ability!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  urank!: number | null;

  @Column({ type: 'smallint', default: -1, nullable: true, transformer: booleanToSmallintTransformer })
  story_read_state!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  vclub_member!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_teenager!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_guardian!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_teenager_list!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  pc_new!: number | null;

  @Column({ type: 'boolean', default: false, nullable: true })
  special_follow!: boolean | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  planet_video!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  video_mark!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  live_status!: number | null;

  @Column({ type: 'bigint', default: 0, nullable: true })
  user_ability_extend!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  status_total_counter!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  video_total_counter!: Record<string, unknown> | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  brand_account!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  hongbaofei!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  reward_status!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  green_mode!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  green_mode_source!: number | null;

  @Column({ type: 'bigint', default: 0, nullable: true })
  urisk!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  unfollowing_recom_switch!: number | null;

  @Column({ type: 'smallint', default: 1, nullable: true, transformer: booleanToSmallintTransformer })
  avatar_type!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_big!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  auth_status!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  auth_realname!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  auth_career!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  auth_career_name!: string | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  show_auth!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_auth!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  is_punish!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  avatar_hd_pid!: string | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  like_display!: number | null;

  @Column({ type: 'smallint', default: 0, nullable: true, transformer: booleanToSmallintTransformer })
  comment_display!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  icons!: Array<Record<string, unknown>> | null;

  @Column({ type: 'jsonb', nullable: true })
  detail!: Array<Record<string, unknown>> | null;
}
