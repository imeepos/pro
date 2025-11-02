import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { WeiboPostEntity, WeiboVisibleType, useEntityManager } from '@pro/entities';
import { PinoLogger } from '@pro/logger-nestjs';
import {
  PostFilterDto,
  PaginationDto,
  SortDto,
} from './dto/weibo-data.dto';
import { WeiboPostConnection, PostStatsModel, WeiboPostModel } from './models/weibo-data.model';
import { PageInfoModel, OFFSET_CURSOR_PREFIX } from '../common/models/pagination.model';

@Injectable()
export class WeiboPostDataService {
  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboPostDataService.name);
  }

  async findPosts(
    filter?: PostFilterDto,
    pagination?: PaginationDto,
    sort?: SortDto,
  ): Promise<WeiboPostConnection> {
    return useEntityManager(async (m) => {
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const qb = m.getRepository(WeiboPostEntity).createQueryBuilder('post');
      this.applyFilters(qb, filter);
      this.applySort(qb, sort);

      const [items, total] = await qb
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return this.buildConnection(items, total, page, limit);
    });
  }

  async findPostById(id: string): Promise<WeiboPostEntity | null> {
    return useEntityManager(async (m) => {
      return m.getRepository(WeiboPostEntity).findOne({
        where: { id },
      });
    });
  }

  async getPostStats(filter?: PostFilterDto): Promise<PostStatsModel> {
    return useEntityManager(async (m) => {
      const qb = m.getRepository(WeiboPostEntity).createQueryBuilder('post');
      this.applyFilters(qb, filter);

      const result = await qb
        .select('COUNT(*)', 'totalPosts')
        .addSelect('COALESCE(SUM(post.reposts_count), 0)', 'totalReposts')
        .addSelect('COALESCE(SUM(post.comments_count), 0)', 'totalComments')
        .addSelect('COALESCE(SUM(post.attitudes_count), 0)', 'totalLikes')
        .getRawOne();

      return {
        totalPosts: Number.parseInt(result.totalPosts, 10),
        totalReposts: Number.parseInt(result.totalReposts, 10),
        totalComments: Number.parseInt(result.totalComments, 10),
        totalLikes: Number.parseInt(result.totalLikes, 10),
      };
    });
  }

  private applyFilters(qb: SelectQueryBuilder<WeiboPostEntity>, filter?: PostFilterDto): void {
    if (!filter) return;

    if (filter.keyword) {
      qb.andWhere('post.text ILIKE :keyword', { keyword: `%${filter.keyword}%` });
    }

    if (filter.authorNickname) {
      qb.andWhere(`post.user ->> 'screen_name' ILIKE :authorNickname`, {
        authorNickname: `%${filter.authorNickname}%`,
      });
    }

    if (filter.dateFrom) {
      qb.andWhere('post.ingested_at >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      qb.andWhere('post.ingested_at <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.isLongText !== undefined) {
      qb.andWhere('post.isLongText = :isLongText', { isLongText: filter.isLongText });
    }

    if (filter.isRepost !== undefined) {
      qb.andWhere('post.mblogtype = :mblogtype', { mblogtype: filter.isRepost ? 1 : 0 });
    }

    if (filter.favorited !== undefined) {
      qb.andWhere('post.favorited = :favorited', { favorited: filter.favorited });
    }
  }

  private applySort(qb: SelectQueryBuilder<WeiboPostEntity>, sort?: SortDto): void {
    const sortField = sort?.field ?? 'createdAt';
    const sortOrder = sort?.order ?? 'DESC';

    const allowedFields = [
      'createdAt',
      'repostsCount',
      'commentsCount',
      'attitudesCount',
      'textLength',
    ];

    const field = allowedFields.includes(sortField) ? sortField : 'createdAt';
    const columnMap: Record<string, string> = {
      createdAt: 'ingested_at',
      repostsCount: 'reposts_count',
      commentsCount: 'comments_count',
      attitudesCount: 'attitudes_count',
      textLength: 'textLength',
    };
    const column = columnMap[field] ?? columnMap.createdAt;
    qb.orderBy(`post.${column}`, sortOrder as 'ASC' | 'DESC');
  }

  private buildConnection(
    items: WeiboPostEntity[],
    total: number,
    page: number,
    limit: number,
  ): WeiboPostConnection {
    const edges = items.map((item, index) => ({
      cursor: `${OFFSET_CURSOR_PREFIX}${(page - 1) * limit + index}`,
      node: this.toModel(item),
    }));

    const hasNextPage = page * limit < total;
    const hasPreviousPage = page > 1;

    const pageInfo: PageInfoModel = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor,
    };

    return {
      edges,
      pageInfo,
      totalCount: total,
    };
  }

  private toModel(entity: WeiboPostEntity): WeiboPostModel {
    return {
      id: entity.id,
      weiboId: entity.idstr ?? entity.mid,
      mid: entity.mid,
      author: this.mapAuthor(entity),
      text: entity.text_raw ?? entity.text ?? '',
      textLength: entity.textLength,
      isLongText: entity.isLongText,
      createdAt: this.parseCreatedAt(entity),
      repostsCount: entity.reposts_count ?? 0,
      commentsCount: entity.comments_count ?? 0,
      attitudesCount: entity.attitudes_count ?? 0,
      source: entity.source ?? undefined,
      regionName: entity.region_name ?? undefined,
      isRepost: this.determineIsRepost(entity),
      favorited: entity.favorited ?? false,
      visibleType: this.mapVisibleType(entity.visible) ?? undefined,
    };
  }

  private mapAuthor(entity: WeiboPostEntity): WeiboPostModel['author'] {
    const rawUser = (entity.user ?? undefined) as unknown as Record<string, unknown> | undefined;
    const read = (key: string): unknown => (rawUser ? rawUser[key] : undefined);
    const fallbackId = entity.id;

    const resolvedId =
      this.coerceString(read('id')) ??
      this.coerceString(read('idstr')) ??
      fallbackId;

    return {
      id: resolvedId,
      weiboId: this.coerceString(read('idstr')) ?? resolvedId,
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

  private mapVisibleType(visible: WeiboPostEntity['visible'] | undefined): WeiboVisibleType | null {
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

  private parseCreatedAt(entity: WeiboPostEntity): Date {
    const raw = entity.created_at;
    if (raw) {
      const parsed = Date.parse(raw);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }
    return entity.ingested_at ?? new Date();
  }

  private determineIsRepost(entity: WeiboPostEntity): boolean {
    const explicitFlag = (entity as unknown as { is_repost?: boolean }).is_repost;
    if (typeof explicitFlag === 'boolean') {
      return explicitFlag;
    }
    if (typeof entity.share_repost_type === 'number') {
      return entity.share_repost_type > 0;
    }
    return entity.mblogtype !== 0;
  }
}
