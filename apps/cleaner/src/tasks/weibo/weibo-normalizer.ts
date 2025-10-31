import { randomUUID } from 'crypto';
import type {
  WeiboCommentEntity as WeiboCommentPayload,
  WeiboProfileInfoResponse,
  WeiboProfileUser,
  WeiboStatusDetail,
  WeiboTagStruct,
  WeiboTimelineResponse,
  WeiboTimelineStatus,
  WeiboUserProfile,
} from '@pro/weibo';
import { WeiboMediaType, WeiboVisibleType } from '@pro/entities';

type AnyRecord = Record<string, any>;

const toRecord = (value: unknown): AnyRecord =>
  value && typeof value === 'object' ? (value as AnyRecord) : {};

export interface NormalizedWeiboUser {
  weiboId: string;
  idstr: string;
  screenName: string;
  domain: string | null;
  weihao: string | null;
  verified: boolean;
  verifiedType: number | null;
  verifiedReason: string | null;
  verifiedTypeExt: number | null;
  profileImageUrl: string | null;
  avatarLarge: string | null;
  avatarHd: string | null;
  followersCount: number;
  friendsCount: number;
  statusesCount: number;
  mbrank: number | null;
  mbtype: number | null;
  vPlus: boolean;
  svip: boolean;
  vvip: boolean;
  userAbility: number[] | null;
  planetVideo: boolean;
  gender: 'm' | 'f' | 'n' | null;
  location: string | null;
  description: string | null;
  followMe: boolean;
  following: boolean;
  onlineStatus: number | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedWeiboUserStats {
  userWeiboId: string;
  snapshotTime: Date;
  followers: number | null;
  following: number | null;
  statuses: number | null;
  likes: number | null;
  dataSource: string;
  versionTag: string | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedWeiboHashtag {
  tagId: string;
  tagName: string;
  tagType: number | null;
  tagHidden: boolean;
  oid: string | null;
  tagScheme: string | null;
  urlTypePic: string | null;
  wHRatio: string | null;
  description: string | null;
  actionLogJson: Record<string, unknown> | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedWeiboMedia {
  mediaId: string;
  mediaType: WeiboMediaType;
  fileUrl: string;
  originalUrl: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  format: string | null;
  thumbnail: string | null;
  bmiddle: string | null;
  large: string | null;
  original: string | null;
  duration: number | null;
  streamUrl: string | null;
  streamUrlHd: string | null;
  mediaInfoJson: Record<string, unknown> | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedWeiboPost {
  weiboId: string;
  mid: string;
  mblogid: string;
  authorWeiboId: string;
  authorNickname: string | null;
  authorAvatar: string | null;
  authorVerifiedInfo: string | null;
  text: string;
  textRaw: string | null;
  textLength: number;
  isLongText: boolean;
  contentAuth: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
  source: string | null;
  regionName: string | null;
  picNum: number | null;
  isPaid: boolean;
  mblogVipType: number | null;
  canEdit: boolean;
  favorited: boolean;
  mblogtype: number;
  isRepost: boolean;
  shareRepostType: number | null;
  visibleType: WeiboVisibleType | null;
  visibleListId: string | null;
  locationJson: Record<string, unknown> | null;
  pageInfoJson: Record<string, unknown> | null;
  actionLogJson: Record<string, unknown> | null;
  analysisExtra: Record<string, unknown> | null;
  rawPayload: Record<string, unknown>;
  hashtags: NormalizedWeiboHashtag[];
  media: NormalizedWeiboMedia[];
}

export interface NormalizedWeiboComment {
  commentId: string;
  idstr: string;
  mid: string;
  rootId: string | null;
  rootMid: string | null;
  postWeiboId: string;
  authorWeiboId: string;
  authorNickname: string | null;
  text: string;
  textRaw: string | null;
  source: string | null;
  floorNumber: number | null;
  createdAt: Date;
  likeCounts: number;
  liked: boolean;
  totalNumber: number | null;
  disableReply: boolean;
  restrictOperate: boolean;
  allowFollow: boolean;
  replyCommentId: string | null;
  replyOriginalText: string | null;
  isMblogAuthor: boolean;
  commentBadge: Record<string, unknown> | null;
  path: string;
  rawPayload: Record<string, unknown>;
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
  }
  return false;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = toNumber(value, Number.NaN);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const parseWeiboDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return new Date();
};

const mapVisibility = (visible: WeiboStatusDetail['visible'] | undefined): WeiboVisibleType | null => {
  if (!visible) return null;
  switch (visible.type) {
    case 0:
      return WeiboVisibleType.Public;
    case 1:
      return WeiboVisibleType.Fans;
    case 2:
      return WeiboVisibleType.Group;
    case 3:
      return WeiboVisibleType.Private;
    case 4:
      return WeiboVisibleType.Custom;
    default:
      return null;
  }
};

const parseActionLog = (payload: unknown): Record<string, unknown> | null => {
  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { value: payload };
    }
  }
  return null;
};

const parseAnalysisExtra = (payload: unknown): Record<string, unknown> | null => {
  if (payload === undefined || payload === null) {
    return null;
  }
  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { raw: payload } satisfies Record<string, unknown>;
    }
  }
  return null;
};

const sanitizeGender = (value: unknown): 'm' | 'f' | 'n' | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'm') return 'm';
  if (normalized === 'f') return 'f';
  if (normalized === 'n') return 'n';
  return null;
};

const extractUserAbility = (value: unknown): number[] | null => {
  if (!Array.isArray(value)) return null;
  const result = value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return item;
      if (typeof item === 'string' && item.trim().length > 0) {
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    })
    .filter((item): item is number => item !== undefined);
  return result.length > 0 ? result : null;
};

const mapHashtag = (tag: WeiboTagStruct): NormalizedWeiboHashtag | null => {
  const tagName = toNullableString(tag?.tag_name);
  const tagId = toNullableString(tag?.oid ?? tag?.tag_name);
  if (!tagName || !tagId) {
    return null;
  }
  return {
    tagId,
    tagName,
    tagType: toNullableNumber(tag?.tag_type),
    tagHidden: toBoolean(tag?.tag_hidden),
    oid: toNullableString(tag?.oid),
    tagScheme: toNullableString(tag?.tag_scheme),
    urlTypePic: toNullableString(tag?.url_type_pic),
    wHRatio: toNullableString(tag?.w_h_ratio),
    description: toNullableString(tag?.desc),
    actionLogJson: parseActionLog((tag as Record<string, unknown>)?.actionlog),
    rawPayload: tag as Record<string, unknown>,
  };
};

const mapPictureVariants = (input: Record<string, unknown> | undefined): NormalizedWeiboMedia => {
  const payload = toRecord(input);
  const large = toRecord(payload.large);
  const original = toRecord(payload.original);
  const thumbnail = toRecord(payload.thumbnail);
  const bmiddle = toRecord(payload.bmiddle);
  const mediaId = toNullableString(payload.pic_id) ?? randomUUID();
  return {
    mediaId,
    mediaType: WeiboMediaType.Image,
    fileUrl: toNullableString(large.url ?? original.url ?? payload.url) ?? '',
    originalUrl: toNullableString(original.url ?? payload.original),
    width: toNullableNumber(large.width ?? payload.width),
    height: toNullableNumber(large.height ?? payload.height),
    fileSize: toNullableNumber(payload.size),
    format: toNullableString(payload.format ?? payload.type),
    thumbnail: toNullableString(thumbnail.url ?? payload.thumbnail),
    bmiddle: toNullableString(bmiddle.url ?? payload.bmiddle),
    large: toNullableString(large.url ?? payload.large),
    original: toNullableString(original.url ?? payload.original),
    duration: toNullableNumber(payload.duration),
    streamUrl: toNullableString(payload.streamUrl ?? payload.stream_url),
    streamUrlHd: toNullableString(payload.stream_url_hd),
    mediaInfoJson: (payload.media_info as Record<string, unknown>) ?? null,
    rawPayload: payload,
  };
};

const extractMedia = (status: WeiboStatusDetail): NormalizedWeiboMedia[] => {
  const media: NormalizedWeiboMedia[] = [];
  const statusRecord = toRecord(status);
  const mixed = toRecord(statusRecord.mix_media_info);
  const mixItems = Array.isArray(mixed.items) ? (mixed.items as AnyRecord[]) : [];

  for (const itemRaw of mixItems) {
    const item = toRecord(itemRaw);
    const data = toRecord(item.data);
    const mediaId = toNullableString(item.id ?? item.object_id ?? item.pic_id);
    const fileUrl =
      toNullableString(
        toRecord(data.original).url ??
          toRecord(data.large).url ??
          data.url ??
          item.url,
      ) ?? '';
    if (!mediaId || !fileUrl) continue;
    media.push({
      mediaId,
      mediaType: WeiboMediaType.Unknown,
      fileUrl,
      originalUrl: toNullableString(toRecord(data.original).url ?? data.url),
      width: toNullableNumber(data.width),
      height: toNullableNumber(data.height),
      fileSize: toNullableNumber(data.size),
      format: toNullableString(data.format),
      thumbnail: toNullableString(data.thumbnail),
      bmiddle: toNullableString(data.bmiddle),
      large: toNullableString(toRecord(data.large).url),
      original: toNullableString(toRecord(data.original).url),
      duration: toNullableNumber(data.duration),
      streamUrl: toNullableString(data.stream_url),
      streamUrlHd: toNullableString(data.stream_url_hd),
      mediaInfoJson: data,
      rawPayload: item,
    });
  }

  const picInfos = statusRecord.pic_infos as Record<string, AnyRecord> | undefined;
  if (picInfos) {
    Object.values(picInfos).forEach((info) => {
      const mediaEntry = mapPictureVariants(info);
      if (mediaEntry.fileUrl) {
        media.push(mediaEntry);
      }
    });
  }

  const pageInfo = toRecord(statusRecord.page_info);
  const mediaInfo = toRecord(pageInfo.media_info);
  const streamUrl = toNullableString(
    mediaInfo.stream_url ?? mediaInfo.mp4_hd_url ?? mediaInfo.h5_url,
  );
  if (streamUrl) {
    media.push({
      mediaId: toNullableString(pageInfo.object_id ?? pageInfo.page_id) ?? randomUUID(),
      mediaType: WeiboMediaType.Video,
      fileUrl: streamUrl,
      originalUrl: toNullableString(mediaInfo.stream_url_hd ?? mediaInfo.h5_url),
      width: toNullableNumber(mediaInfo.width),
      height: toNullableNumber(mediaInfo.height),
      fileSize: toNullableNumber(mediaInfo.size),
      format: toNullableString(mediaInfo.format),
      thumbnail: toNullableString(pageInfo.page_pic),
      bmiddle: null,
      large: null,
      original: null,
      duration: toNullableNumber(mediaInfo.duration),
      streamUrl,
      streamUrlHd: toNullableString(mediaInfo.stream_url_hd),
      mediaInfoJson: mediaInfo,
      rawPayload: mediaInfo,
    });
  }

  return media;
};

export const normalizeUser = (user: WeiboUserProfile | WeiboProfileUser | undefined): NormalizedWeiboUser | null => {
  if (!user) return null;
  const weiboId = toNullableString(user.id);
  if (!weiboId) return null;
  const userRecord = user as unknown as Record<string, unknown>;
  return {
    weiboId,
    idstr: toNullableString(user.idstr) ?? weiboId,
    screenName: toNullableString(user.screen_name) ?? weiboId,
    domain: toNullableString(userRecord.domain),
    weihao: toNullableString(userRecord.weihao),
    verified: toBoolean(user.verified),
    verifiedType: toNullableNumber(user.verified_type),
    verifiedReason: toNullableString(userRecord.verified_reason),
    verifiedTypeExt: toNullableNumber(userRecord.verified_type_ext),
    profileImageUrl: toNullableString(user.profile_image_url),
    avatarLarge: toNullableString(userRecord.avatar_large),
    avatarHd: toNullableString(userRecord.avatar_hd),
    followersCount: toNumber(userRecord.followers_count, 0),
    friendsCount: toNumber(userRecord.friends_count, 0),
    statusesCount: toNumber(userRecord.statuses_count, 0),
    mbrank: toNullableNumber(userRecord.mbrank),
    mbtype: toNullableNumber(userRecord.mbtype),
    vPlus: toBoolean(userRecord.v_plus),
    svip: toBoolean(userRecord.svip),
    vvip: toBoolean(userRecord.vvip),
    userAbility: extractUserAbility(userRecord.user_ability),
    planetVideo: toBoolean(userRecord.planet_video),
    gender: sanitizeGender(userRecord.gender),
    location: toNullableString(userRecord.location),
    description: toNullableString(userRecord.description),
    followMe: toBoolean(userRecord.follow_me),
    following: toBoolean(userRecord.following),
    onlineStatus: toNullableNumber(userRecord.online_status),
    rawPayload: userRecord,
  };
};

export const normalizeStatus = (status: WeiboStatusDetail): NormalizedWeiboPost | null => {
  const weiboId = toNullableString(status?.id);
  if (!weiboId) return null;

  const statusRecord = toRecord(status as unknown as Record<string, unknown>);
  const pageInfo = toRecord(statusRecord.page_info);

  return {
    weiboId,
    mid: toNullableString(status.mid) ?? weiboId,
    mblogid: toNullableString(statusRecord.mblogid ?? status.mid) ?? weiboId,
    authorWeiboId: toNullableString(status.user?.id) ?? weiboId,
    authorNickname: toNullableString(status.user?.screen_name),
    authorAvatar: toNullableString(status.user?.profile_image_url),
    authorVerifiedInfo: toNullableString(toRecord(status.user).verified_reason),
    text: toNullableString(statusRecord.text) ?? '',
    textRaw: toNullableString(statusRecord.text_raw),
    textLength: toNumber(statusRecord.textLength, 0),
    isLongText: toBoolean(statusRecord.isLongText),
    contentAuth: toNullableString(statusRecord.content_auth),
    createdAt: parseWeiboDate(status.created_at),
    publishedAt: parseWeiboDate(statusRecord.created_at ?? status.created_at),
    repostsCount: toNumber(status.reposts_count, 0),
    commentsCount: toNumber(status.comments_count, 0),
    attitudesCount: toNumber(status.attitudes_count, 0),
    source: toNullableString(status.source),
    regionName: toNullableString(statusRecord.region_name),
    picNum: toNullableNumber(statusRecord.pic_num),
    isPaid: toBoolean(statusRecord.is_paid),
    mblogVipType: toNullableNumber(statusRecord.mblog_vip_type),
    canEdit: toBoolean(statusRecord.can_edit),
    favorited: toBoolean(statusRecord.favorited),
    mblogtype: toNumber(statusRecord.mblogtype, 0),
    isRepost: toBoolean(statusRecord.is_repost ?? statusRecord.retweeted_status),
    shareRepostType: toNullableNumber(statusRecord.share_repost_type),
    visibleType: mapVisibility(status.visible),
    visibleListId: toNullableString(status.visible?.list_id),
    locationJson: (statusRecord.geo as Record<string, unknown>) ?? null,
    pageInfoJson: pageInfo,
    actionLogJson: parseActionLog(statusRecord.actionlog),
    analysisExtra: parseAnalysisExtra(statusRecord.analysis_extra),
    rawPayload: status as unknown as Record<string, unknown>,
    hashtags: (statusRecord.tag_struct as WeiboTagStruct[] | undefined)
      ?.map((tag) => mapHashtag(tag))
      .filter((tag): tag is NormalizedWeiboHashtag => tag !== null) ?? [],
    media: extractMedia(status),
  };
};

const flattenComments = (
  comments: readonly WeiboCommentPayload[] | undefined,
  postWeiboId: string,
  parentPath: string[] = [],
  parentId: string | null = null,
  root: { id: string | null; mid: string | null } = { id: null, mid: null },
): NormalizedWeiboComment[] => {
  if (!Array.isArray(comments) || comments.length === 0) {
    return [];
  }

  const records: NormalizedWeiboComment[] = [];
  for (const comment of comments) {
    const commentId = toNullableString(comment.id);
    if (!commentId) continue;
    const path = [...parentPath, commentId];
    const authorWeiboId = toNullableString(comment.user?.id);
    if (!authorWeiboId) continue;
    const currentRoot = parentId ? root : { id: commentId, mid: toNullableString(comment.mid) };

    records.push({
      commentId,
      idstr: toNullableString(comment.idstr) ?? commentId,
      mid: toNullableString(comment.mid) ?? commentId,
      rootId: currentRoot.id,
      rootMid: currentRoot.mid,
      postWeiboId,
      authorWeiboId,
      authorNickname: toNullableString(comment.user?.screen_name),
      text: toNullableString(comment.text) ?? '',
      textRaw: toNullableString(comment.text_raw),
      source: toNullableString(comment.source),
      floorNumber: toNullableNumber(comment.floor_number),
      createdAt: parseWeiboDate(comment.created_at),
      likeCounts: toNumber(comment.like_counts, 0),
      liked: toBoolean(comment.liked),
      totalNumber: toNullableNumber(comment.total_number),
      disableReply: toBoolean(comment.disable_reply),
      restrictOperate: toBoolean(comment.restrictOperate),
      allowFollow: toBoolean(comment.allow_follow ?? true),
      replyCommentId: parentId,
      replyOriginalText: toNullableString(comment.reply_original_text),
      isMblogAuthor: toBoolean(comment.is_mblog_author),
      commentBadge: Array.isArray(comment.comment_badge)
        ? { items: comment.comment_badge as Record<string, unknown>[] }
        : null,
      path: path.join('.'),
      rawPayload: comment as unknown as Record<string, unknown>,
    });

    records.push(
      ...flattenComments(
        comment.comments as WeiboCommentPayload[] | undefined,
        postWeiboId,
        path,
        commentId,
        currentRoot,
      ),
    );
  }

  return records;
};

export const normalizeComments = (
  response: WeiboCommentPayload[] | undefined,
  postWeiboId: string,
): NormalizedWeiboComment[] => flattenComments(response, postWeiboId);

export const normalizeTimeline = (raw: unknown): WeiboTimelineStatus[] => {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const parsed = raw as WeiboTimelineResponse | Record<string, unknown>;
  if ('cards' in parsed && Array.isArray((parsed as Record<string, unknown>).cards)) {
    const result: WeiboTimelineStatus[] = [];
    const visit = (node: unknown): void => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node === 'object') {
        const record = node as Record<string, unknown>;
        if (record.mblog && typeof record.mblog === 'object') {
          result.push(record.mblog as WeiboTimelineStatus);
        }
        if (Array.isArray(record.card_group)) {
          visit(record.card_group);
        }
        if (Array.isArray(record.cards)) {
          visit(record.cards);
        }
      }
    };
    visit((parsed as Record<string, unknown>).cards);
    return result;
  }

  if ('data' in parsed && parsed.data && typeof parsed.data === 'object') {
    const data = parsed.data as Record<string, unknown>;
    if (Array.isArray(data.list)) {
      return data.list as WeiboTimelineStatus[];
    }
  }

  if (Array.isArray((parsed as Record<string, unknown>).card_group)) {
    return ((parsed as Record<string, unknown>).card_group as Record<string, unknown>[])
      .map((card) => card.mblog as WeiboTimelineStatus)
      .filter((item): item is WeiboTimelineStatus => Boolean(item));
  }

  return [];
};

export const normalizeProfileSnapshot = (
  response: WeiboProfileInfoResponse | Record<string, unknown>,
  sourceLabel: string,
): NormalizedWeiboUserStats | null => {
  const responseRecord = toRecord(response);
  const dataRecord = toRecord(responseRecord.data);
  if (Object.keys(dataRecord).length === 0) {
    return null;
  }
  const user = dataRecord.user as WeiboProfileUser | undefined;
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return null;
  }

  return {
    userWeiboId: normalizedUser.weiboId,
    snapshotTime: new Date(),
    followers: toNullableNumber(user?.followers_count),
    following: toNullableNumber(user?.friends_count),
    statuses: toNullableNumber(user?.statuses_count),
    likes: toNullableNumber(
      (user?.status_total_counter as Record<string, unknown> | undefined)?.like_cnt,
    ),
    dataSource: sourceLabel,
    versionTag: toNullableString(dataRecord.version),
    rawPayload: responseRecord,
  };
};
