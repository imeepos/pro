import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Entity } from './decorator.js';

interface Visible {
  type: number;
  list_id: number;
}

interface StatusTotalCounter {
  total_cnt_format: string;
  comment_cnt: string;
  repost_cnt: string;
  like_cnt: string;
  total_cnt: string;
}

interface IconData {
  mbrank: number;
  mbtype: number;
  svip: number;
  vvip: number;
}

interface IconListItem {
  type: string;
  data: IconData;
}

interface User {
  id: number;
  idstr: string;
  pc_new: number;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
  verified: boolean;
  verified_type: number;
  domain: string;
  weihao: string;
  verified_type_ext: number;
  status_total_counter: StatusTotalCounter;
  avatar_large: string;
  avatar_hd: string;
  follow_me: boolean;
  following: boolean;
  mbrank: number;
  mbtype: number;
  v_plus: number;
  user_ability: number;
  planet_video: boolean;
  icon_list: IconListItem[];
}

interface Annotation {
  photo_sub_type?: string;
  super_exparams?: string;
  client_mblogid?: string;
  source_text?: string;
  phone_id?: string;
  mapi_request?: boolean;
}

interface NumberDisplayStrategy {
  apply_scenario_flag: number;
  display_text_min_number: number;
  display_text: string;
}

interface TitleSource {
  name: string;
  url: string;
  image: string;
}

interface CommentManageInfo {
  comment_permission_type: number;
  approval_comment_type: number;
  comment_sort_type: number;
}

interface IconItem {
  name?: string;
  url: string;
  scheme?: string;
  length?: number;
  type?: string;
}

interface Truncation {
  mode: number;
  keep_end_size?: number;
}

interface Actionlog {
  act_code: number | string;
  oid?: string;
  uicode?: string | null;
  luicode?: string | null;
  fid?: string | null;
  ext?: string;
  act_type?: number;
  uuid?: number;
  cardid?: string;
  lcardid?: string;
  lfid?: string;
  mid?: string;
  source?: string;
  code?: number | string;
  mark?: string;
  uid?: string;
}

interface ScreenNameSuffixNew {
  content: string;
  remark?: string;
  color: string;
  dark_color: string;
  type: number;
  icons?: IconItem[];
  icons_location?: number;
  truncation: Truncation;
  scheme?: string;
  actionlog?: Actionlog;
}

interface TopicStructItem {
  title: string;
  topic_url: string;
  topic_title: string;
  actionlog: Actionlog;
}

interface UrlStructItem {
  url_title: string;
  url_type_pic: string;
  ori_url: string;
  page_id: string;
  short_url: string;
  long_url: string;
  url_type: number | string;
  result: boolean;
  actionlog: Actionlog;
  storage_type: string;
  hide: number;
  object_type: string;
  ttl?: number;
  h5_target_url: string;
  need_save_obj: number;
}

interface Title {
  text: string;
  base_color: number;
  icon_url: string;
}

interface ButtonParams {
  uid: string;
  scheme: string;
  type: string;
}

interface Button {
  name: string;
  pic: string;
  type: string;
  params: ButtonParams;
  actionlog: Actionlog;
}

interface CommonStructItem {
  url: string;
  name: string;
  desc: string;
  img: string;
  type: number;
  btn_show_type: string;
  page_id: string;
  actionlog: Actionlog;
  buttons: Button[];
  hidden: number;
}

interface PicInfo {
  height: number | string;
  url: string;
  width: number | string;
}

interface PicInfoGroup {
  pic_big: PicInfo;
  pic_small: PicInfo;
  pic_middle: PicInfo;
}

interface TranscodeInfo {
  pcdn_rule_id: number;
  pcdn_jank: number;
  origin_video_dr: string;
  ab_strategies: string;
}

interface Extension {
  transcode_info: TranscodeInfo;
}

interface PlayInfo {
  type: number;
  mime: string;
  protocol: string;
  label: string;
  url: string;
  bitrate?: number;
  prefetch_range?: string;
  video_codecs?: string;
  fps?: number;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  sar?: string;
  audio_codecs?: string;
  audio_sample_rate?: number;
  quality_label: string;
  quality_class: string;
  quality_desc: string;
  audio_channels?: number;
  audio_sample_fmt?: string;
  audio_bits_per_sample?: number;
  watermark?: string;
  extension: Extension;
  video_decoder: string;
  prefetch_enabled: boolean;
  tcp_receive_buffer: number;
  dolby_atmos?: boolean;
  color_transfer?: string;
  stereo_video?: number;
  first_pkt_end_pos?: number;
  col?: number;
  row?: number;
  interval?: number;
  offset?: number;
  urls?: string[];
}

interface Meta {
  label: string;
  quality_index: number;
  quality_desc: string;
  quality_label: string;
  quality_class: string;
  type: number;
  quality_group: number;
  is_hidden: boolean;
}

interface PlaybackListItem {
  meta: Meta;
  play_info: PlayInfo;
}

interface AuthorInfo {
  id: number;
  idstr: string;
  pc_new: number;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
  verified: boolean;
  verified_type: number;
  domain: string;
  weihao: string;
  verified_type_ext: number;
  status_total_counter: StatusTotalCounter;
  avatar_large: string;
  avatar_hd: string;
  follow_me: boolean;
  following: boolean;
  mbrank: number;
  mbtype: number;
  v_plus: number;
  user_ability: number;
  planet_video: boolean;
  verified_reason: string;
  description: string;
  location: string;
  gender: string;
  followers_count: number;
  followers_count_str: string;
  friends_count: number;
  statuses_count: number;
  url: string;
  svip: number;
  vvip: number;
  cover_image_phone: string;
}

interface BigPicInfo {
  pic_big: PicInfo;
  pic_small: PicInfo;
  pic_middle: PicInfo;
}

interface VideoDownloadStrategy {
  abandon_download: number;
}

interface ExtraInfo {
  sceneid: string;
}

interface ExtInfo {
  video_orientation: string;
}

interface PlayCompletionActionActionlog {
  oid: string;
  act_code: number;
  act_type: number;
  source: string;
  mid: string;
  code: string;
  mark: string;
  ext: string | null;
}

interface PlayCompletionAction {
  type: string;
  icon: string;
  text: string;
  link: string;
  btn_code: number;
  show_position: number;
  actionlog: PlayCompletionActionActionlog;
}

interface MediaInfo {
  name: string;
  stream_url: string;
  stream_url_hd: string;
  format: string;
  h5_url: string;
  mp4_sd_url: string;
  mp4_hd_url: string;
  h265_mp4_hd: string;
  h265_mp4_ld: string;
  inch_4_mp4_hd: string;
  inch_5_mp4_hd: string;
  inch_5_5_mp4_hd: string;
  mp4_720p_mp4: string;
  hevc_mp4_720p: string;
  prefetch_type: number;
  prefetch_size: number;
  act_status: number;
  protocol: string;
  media_id: string;
  origin_total_bitrate: number;
  video_orientation: string;
  duration: number;
  forward_strategy: number;
  search_scheme: string;
  is_short_video: number;
  vote_is_show: number;
  belong_collection: number;
  titles_display_time: string;
  show_progress_bar: number;
  show_mute_button: boolean;
  ext_info: ExtInfo;
  next_title: string;
  kol_title: string;
  play_completion_actions: PlayCompletionAction[];
  video_publish_time: number;
  play_loop_type: number;
  author_mid: string;
  author_name: string;
  extra_info: ExtraInfo;
  video_download_strategy: VideoDownloadStrategy;
  jump_to: number;
  big_pic_info: BigPicInfo;
  online_users: string;
  online_users_number: number;
  ttl: number;
  storage_type: string;
  is_keep_current_mblog: number;
  has_recommend_video: number;
  author_info: AuthorInfo;
  playback_list: PlaybackListItem[];
}

interface PageInfo {
  type: string;
  page_id: string;
  object_type: string;
  object_id: string;
  content1: string;
  content2: string;
  act_status: number;
  media_info: MediaInfo;
  page_pic: string;
  page_title: string;
  page_url: string;
  pic_info: PicInfoGroup;
  oid: string;
  type_icon: string;
  author_id: string;
  authorid: string;
  warn: string;
  actionlog: Actionlog;
  short_url: string;
}

@Entity('weibo_posts')
@Index(['id'], { unique: true })
@Index(['mid'], { unique: true })
export class WeiboPostEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'jsonb', name: 'visible' })
  visible!: Visible;

  @Column({ type: 'varchar', length: 255, name: 'created_at' })
  created_at!: string;

  @Column({ type: 'varchar', length: 64, name: 'idstr' })
  idstr!: string;

  @Column({ type: 'varchar', length: 64, name: 'mid' })
  mid!: string;

  @Column({ type: 'varchar', length: 64, name: 'mblogid' })
  mblogid!: string;

  @Column({ type: 'jsonb', name: 'user' })
  user!: User;

  @Column({ type: 'boolean', name: 'can_edit' })
  can_edit!: boolean;

  @Column({ type: 'integer', name: 'textLength' })
  textLength!: number;

  @Column({ type: 'jsonb', name: 'annotations' })
  annotations!: Annotation[];

  @Column({ type: 'text', name: 'source' })
  source!: string;

  @Column({ type: 'boolean', name: 'favorited' })
  favorited!: boolean;

  @Column({ type: 'varchar', length: 255, name: 'mark', nullable: true })
  mark!: string;

  @Column({ type: 'varchar', length: 255, name: 'rid' })
  rid!: string;

  @Column({ type: 'varchar', length: 255, name: 'cardid' })
  cardid!: string;

  @Column({ type: 'jsonb', name: 'pic_ids' })
  pic_ids!: string[];

  @Column({ type: 'integer', name: 'pic_num' })
  pic_num!: number;

  @Column({ type: 'boolean', name: 'is_paid' })
  is_paid!: boolean;

  @Column({ type: 'text', name: 'pic_bg_new', nullable: true })
  pic_bg_new!: string | null;

  @Column({ type: 'integer', name: 'mblog_vip_type' })
  mblog_vip_type!: number;

  @Column({ type: 'jsonb', name: 'number_display_strategy' })
  number_display_strategy!: NumberDisplayStrategy;

  @Column({ type: 'jsonb', name: 'title_source', nullable: true })
  title_source!: TitleSource | null;

  @Column({ type: 'integer', name: 'reposts_count' })
  reposts_count!: number;

  @Column({ type: 'integer', name: 'comments_count' })
  comments_count!: number;

  @Column({ type: 'integer', name: 'attitudes_count' })
  attitudes_count!: number;

  @Column({ type: 'integer', name: 'attitudes_status' })
  attitudes_status!: number;

  @Column({ type: 'boolean', name: 'isLongText' })
  isLongText!: boolean;

  @Column({ type: 'integer', name: 'mlevel' })
  mlevel!: number;

  @Column({ type: 'integer', name: 'content_auth' })
  content_auth!: number;

  @Column({ type: 'integer', name: 'is_show_bulletin' })
  is_show_bulletin!: number;

  @Column({ type: 'jsonb', name: 'comment_manage_info' })
  comment_manage_info!: CommentManageInfo;

  @Column({ type: 'jsonb', name: 'screen_name_suffix_new' })
  screen_name_suffix_new!: ScreenNameSuffixNew[];

  @Column({ type: 'integer', name: 'share_repost_type' })
  share_repost_type!: number;

  @Column({ type: 'jsonb', name: 'topic_struct' })
  topic_struct!: TopicStructItem[];

  @Column({ type: 'jsonb', name: 'url_struct' })
  url_struct!: UrlStructItem[];

  @Column({ type: 'jsonb', name: 'title', nullable: true })
  title!: Title | null;

  @Column({ type: 'integer', name: 'mblogtype' })
  mblogtype!: number;

  @Column({ type: 'boolean', name: 'showFeedRepost' })
  showFeedRepost!: boolean;

  @Column({ type: 'boolean', name: 'showFeedComment' })
  showFeedComment!: boolean;

  @Column({ type: 'boolean', name: 'pictureViewerSign' })
  pictureViewerSign!: boolean;

  @Column({ type: 'boolean', name: 'showPictureViewer' })
  showPictureViewer!: boolean;

  @Column({ type: 'jsonb', name: 'rcList' })
  rcList!: unknown[];

  @Column({ type: 'jsonb', name: 'common_struct' })
  common_struct!: CommonStructItem[];

  @Column({ type: 'text', name: 'analysis_extra' })
  analysis_extra!: string;

  @Column({ type: 'varchar', length: 255, name: 'readtimetype' })
  readtimetype!: string;

  @Column({ type: 'integer', name: 'mixed_count' })
  mixed_count!: number;

  @Column({ type: 'boolean', name: 'is_show_mixed' })
  is_show_mixed!: boolean;

  @Column({ type: 'jsonb', name: 'mblog_feed_back_menus_format' })
  mblog_feed_back_menus_format!: unknown[];

  @Column({ type: 'boolean', name: 'isAd' })
  isAd!: boolean;

  @Column({ type: 'boolean', name: 'isSinglePayAudio' })
  isSinglePayAudio!: boolean;

  @Column({ type: 'text', name: 'text' })
  text!: string;

  @Column({ type: 'text', name: 'text_raw' })
  text_raw!: string;

  @Column({ type: 'varchar', length: 255, name: 'region_name', nullable: true })
  region_name!: string | null;

  @Column({ type: 'jsonb', name: 'page_info', nullable: true })
  page_info!: PageInfo | null;

  @Column({ type: 'integer', name: 'ok' })
  ok!: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'ingested_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ingested_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deleted_at!: Date | null;
}
