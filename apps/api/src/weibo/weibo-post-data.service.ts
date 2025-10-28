import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WeiboPostEntity } from '@pro/entities';
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
    @InjectRepository(WeiboPostEntity)
    private readonly postRepo: Repository<WeiboPostEntity>,
  ) {
    this.logger.setContext(WeiboPostDataService.name);
  }

  async findPosts(
    filter?: PostFilterDto,
    pagination?: PaginationDto,
    sort?: SortDto,
  ): Promise<WeiboPostConnection> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.postRepo.createQueryBuilder('post');
    this.applyFilters(qb, filter);
    this.applySort(qb, sort);

    qb.leftJoinAndSelect('post.author', 'author');

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return this.buildConnection(items, total, page, limit);
  }

  async findPostById(id: string): Promise<WeiboPostEntity | null> {
    return this.postRepo.findOne({
      where: { id },
      relations: ['author', 'media'],
    });
  }

  async getPostStats(filter?: PostFilterDto): Promise<PostStatsModel> {
    const qb = this.postRepo.createQueryBuilder('post');
    this.applyFilters(qb, filter);

    const result = await qb
      .select('COUNT(*)', 'totalPosts')
      .addSelect('COALESCE(SUM(post.repostsCount), 0)', 'totalReposts')
      .addSelect('COALESCE(SUM(post.commentsCount), 0)', 'totalComments')
      .addSelect('COALESCE(SUM(post.attitudesCount), 0)', 'totalLikes')
      .getRawOne();

    return {
      totalPosts: Number.parseInt(result.totalPosts, 10),
      totalReposts: Number.parseInt(result.totalReposts, 10),
      totalComments: Number.parseInt(result.totalComments, 10),
      totalLikes: Number.parseInt(result.totalLikes, 10),
    };
  }

  private applyFilters(qb: SelectQueryBuilder<WeiboPostEntity>, filter?: PostFilterDto): void {
    if (!filter) return;

    if (filter.keyword) {
      qb.andWhere('post.text ILIKE :keyword', { keyword: `%${filter.keyword}%` });
    }

    if (filter.authorNickname) {
      qb.andWhere('post.authorNickname ILIKE :authorNickname', {
        authorNickname: `%${filter.authorNickname}%`,
      });
    }

    if (filter.dateFrom) {
      qb.andWhere('post.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      qb.andWhere('post.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.isLongText !== undefined) {
      qb.andWhere('post.isLongText = :isLongText', { isLongText: filter.isLongText });
    }

    if (filter.isRepost !== undefined) {
      qb.andWhere('post.isRepost = :isRepost', { isRepost: filter.isRepost });
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
    qb.orderBy(`post.${field}`, sortOrder as 'ASC' | 'DESC');
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
      weiboId: entity.weiboId,
      mid: entity.mid,
      author: entity.author ? {
        id: entity.author.id,
        weiboId: entity.author.weiboId,
        screenName: entity.author.screenName,
        profileImageUrl: entity.author.profileImageUrl ?? undefined,
        verified: entity.author.verified,
        verifiedReason: entity.author.verifiedReason ?? undefined,
        followersCount: entity.author.followersCount,
        friendsCount: entity.author.friendsCount,
        statusesCount: entity.author.statusesCount,
        gender: entity.author.gender ?? undefined,
        location: entity.author.location ?? undefined,
        description: entity.author.description ?? undefined,
      } : undefined as any,
      text: entity.text,
      textLength: entity.textLength,
      isLongText: entity.isLongText,
      createdAt: entity.createdAt,
      repostsCount: entity.repostsCount,
      commentsCount: entity.commentsCount,
      attitudesCount: entity.attitudesCount,
      source: entity.source ?? undefined,
      regionName: entity.regionName ?? undefined,
      isRepost: entity.isRepost,
      favorited: entity.favorited,
      visibleType: entity.visibleType ?? undefined,
    };
  }
}
