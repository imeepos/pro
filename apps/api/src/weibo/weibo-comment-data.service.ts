import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { PinoLogger } from '@pro/logger-nestjs';
import { WeiboCommentEntity, useEntityManager } from '@pro/entities';
import {
  CommentFilterDto,
  PaginationDto,
  SortDto,
  SortOrder,
} from './dto/weibo-data.dto';
import {
  WeiboCommentConnection,
  CommentStatsModel,
  WeiboCommentModel,
} from './models/weibo-data.model';
import { PageInfoModel, OFFSET_CURSOR_PREFIX } from '../common/models/pagination.model';

@Injectable()
export class WeiboCommentDataService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(WeiboCommentDataService.name);
  }

  async findComments(
    filter?: CommentFilterDto,
    pagination?: PaginationDto,
    sort?: SortDto,
  ): Promise<WeiboCommentConnection> {
    return useEntityManager(async (m) => {
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const repository = m.getRepository(WeiboCommentEntity);
      const qb = repository.createQueryBuilder('comment');

      this.applyFilters(qb, filter);
      this.applySort(qb, sort);

      const skip = (page - 1) * limit;
      const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

      const edges = items.map((item, index) => ({
        cursor: `${OFFSET_CURSOR_PREFIX}${skip + index}`,
        node: this.toModel(item),
      }));

      const pageInfo: PageInfoModel = {
        hasNextPage: skip + items.length < total,
        hasPreviousPage: page > 1,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      };

      return {
        edges,
        pageInfo,
        totalCount: total,
      };
    });
  }

  async findCommentById(id: string): Promise<WeiboCommentEntity | null> {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(WeiboCommentEntity);
      const numericId = Number(id);
      if (Number.isFinite(numericId)) {
        const byNumeric = await repository.findOne({ where: { id: numericId } });
        if (byNumeric) {
          return byNumeric;
        }
      }
      return repository.findOne({ where: { idstr: id } });
    });
  }

  async getCommentStats(filter?: CommentFilterDto): Promise<CommentStatsModel> {
    return useEntityManager(async (m) => {
      const qb = m.getRepository(WeiboCommentEntity).createQueryBuilder('comment');
      this.applyFilters(qb, filter);

      const result = await qb
        .select('COUNT(*)', 'totalComments')
        .addSelect('COALESCE(SUM(comment.like_counts), 0)', 'totalLikes')
        .getRawOne();

      return {
        totalComments: Number.parseInt(result.totalComments, 10),
        totalLikes: Number.parseInt(result.totalLikes, 10),
      };
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<WeiboCommentEntity>,
    filter?: CommentFilterDto,
  ): void {
    if (!filter) return;

    if (filter.keyword) {
      qb.andWhere('comment.text ILIKE :keyword', { keyword: `%${filter.keyword}%` });
    }

    if (filter.authorNickname) {
      qb.andWhere(`comment."user" ->> 'screen_name' ILIKE :authorNickname`, {
        authorNickname: `%${filter.authorNickname}%`,
      });
    }

    if (filter.postId) {
      qb.andWhere(`comment.more_info ->> 'post_weibo_id' = :postId`, {
        postId: filter.postId,
      });
    }

    if (filter.dateFrom) {
      qb.andWhere('comment.ingestedAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      qb.andWhere('comment.ingestedAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.hasLikes) {
      qb.andWhere('comment.like_counts > 0');
    }
  }

  private applySort(qb: SelectQueryBuilder<WeiboCommentEntity>, sort?: SortDto): void {
    const sortField = sort?.field ?? 'createdAt';
    const sortOrder = sort?.order ?? SortOrder.DESC;

    const columnMap: Record<string, string> = {
      createdAt: 'ingestedAt',
      likeCounts: 'like_counts',
      floorNumber: 'floor_number',
    };

    const column = columnMap[sortField] ?? columnMap.createdAt;
    qb.orderBy(`comment.${column}`, sortOrder);
  }

  private toModel(entity: WeiboCommentEntity): WeiboCommentModel {
    const raw = entity as WeiboCommentEntity & Record<string, unknown>;
    const rawUser = (raw.user ?? undefined) as Record<string, unknown> | undefined;
    const moreInfo = (raw.more_info ?? undefined) as Record<string, unknown> | undefined;

    return {
      id: raw.id?.toString() ?? this.coerceString(raw.idstr) ?? 'unknown',
      commentId: this.coerceString(raw.idstr) ?? raw.id?.toString() ?? 'unknown-comment',
      mid: this.coerceString(raw.mid) ?? 'unknown-mid',
      postId:
        this.coerceString(moreInfo?.post_weibo_id) ??
        this.coerceString(moreInfo?.target_weibo_id) ??
        this.coerceString(raw.rootidstr) ??
        'unknown-post',
      author: this.mapAuthorFromComment(rawUser, raw.id?.toString() ?? 'unknown-author'),
      text: this.coerceString(raw.text_raw) ?? this.coerceString(raw.text) ?? '',
      createdAt: this.parseCreatedAt(this.coerceString(raw.created_at)),
      likeCounts: this.coerceNumber(raw.like_counts),
      liked: Boolean(raw.liked),
      source: this.coerceString(raw.source) ?? undefined,
      replyCommentId:
        this.coerceString(moreInfo?.reply_comment_id) ?? this.coerceString(raw.rootidstr) ?? undefined,
      isMblogAuthor: Boolean(raw.isLikedByMblogAuthor),
    };
  }

  private mapAuthorFromComment(
    rawUser: Record<string, unknown> | undefined,
    fallbackId: string,
  ): WeiboCommentModel['author'] {
    const read = (key: string): unknown => (rawUser ? rawUser[key] : undefined);
    const idCandidate = read('id') ?? read('idstr') ?? fallbackId;
    const id = this.coerceString(idCandidate) ?? fallbackId;

    return {
      id,
      weiboId: this.coerceString(read('idstr')) ?? id,
      screenName: this.coerceString(read('screen_name')) ?? '未知用户',
      profileImageUrl: this.coerceString(read('profile_image_url')) ?? undefined,
      verified: Boolean(read('verified')),
      verifiedReason: this.coerceString(read('verified_reason')) ?? undefined,
      followersCount: this.coerceNumber(read('followers_count')),
      friendsCount: this.coerceNumber(read('friends_count')),
      statusesCount: this.coerceNumber(read('statuses_count')),
      gender: this.coerceString(read('gender')) ?? undefined,
      location: this.coerceString(read('location')) ?? undefined,
      description: this.coerceString(read('description')) ?? undefined,
    };
  }

  private coerceString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return undefined;
  }

  private coerceNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private parseCreatedAt(value: string | undefined): Date {
    if (!value) {
      return new Date();
    }
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
    return new Date();
  }
}
