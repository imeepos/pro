import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from '@pro/logger-nestjs';
import { Repository } from 'typeorm';
import { WeiboCommentEntity } from '@pro/entities';
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
import { PageInfoModel } from '../common/models/pagination.model';

@Injectable()
export class WeiboCommentDataService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboCommentEntity)
    private readonly commentRepo: Repository<WeiboCommentEntity>,
  ) {
    this.logger.setContext(WeiboCommentDataService.name);
  }

  async findComments(
    filter?: CommentFilterDto,
    pagination?: PaginationDto,
    sort?: SortDto,
  ): Promise<WeiboCommentConnection> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.post', 'post');

    if (filter?.keyword) {
      qb.andWhere('comment.text ILIKE :keyword', {
        keyword: `%${filter.keyword}%`,
      });
    }

    if (filter?.authorNickname) {
      qb.andWhere('comment.authorNickname ILIKE :authorNickname', {
        authorNickname: `%${filter.authorNickname}%`,
      });
    }

    if (filter?.postId) {
      qb.andWhere('comment.postId = :postId', { postId: filter.postId });
    }

    if (filter?.dateFrom && filter?.dateTo) {
      qb.andWhere('comment.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    } else if (filter?.dateFrom) {
      qb.andWhere('comment.createdAt >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    } else if (filter?.dateTo) {
      qb.andWhere('comment.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter?.hasLikes) {
      qb.andWhere('comment.likeCounts > 0');
    }

    const sortField = sort?.field ?? 'createdAt';
    const sortOrder = sort?.order ?? SortOrder.DESC;
    qb.orderBy(`comment.${sortField}`, sortOrder);

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const edges = items.map((item, index) => ({
      cursor: `offset:${skip + index}`,
      node: this.toModel(item),
    }));

    const hasNextPage = skip + items.length < total;
    const hasPreviousPage = page > 1;

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      } as PageInfoModel,
      totalCount: total,
    };
  }

  async findCommentById(id: string): Promise<WeiboCommentEntity | null> {
    return this.commentRepo.findOne({
      where: { id },
      relations: ['author', 'post'],
    });
  }

  async getCommentStats(filter?: CommentFilterDto): Promise<CommentStatsModel> {
    const qb = this.commentRepo.createQueryBuilder('comment');

    if (filter?.keyword) {
      qb.andWhere('comment.text ILIKE :keyword', {
        keyword: `%${filter.keyword}%`,
      });
    }

    if (filter?.authorNickname) {
      qb.andWhere('comment.authorNickname ILIKE :authorNickname', {
        authorNickname: `%${filter.authorNickname}%`,
      });
    }

    if (filter?.postId) {
      qb.andWhere('comment.postId = :postId', { postId: filter.postId });
    }

    if (filter?.dateFrom && filter?.dateTo) {
      qb.andWhere('comment.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    } else if (filter?.dateFrom) {
      qb.andWhere('comment.createdAt >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    } else if (filter?.dateTo) {
      qb.andWhere('comment.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter?.hasLikes) {
      qb.andWhere('comment.likeCounts > 0');
    }

    const result = await qb
      .select('COUNT(comment.id)', 'totalComments')
      .addSelect('COALESCE(SUM(comment.likeCounts), 0)', 'totalLikes')
      .getRawOne();

    return {
      totalComments: Number.parseInt(result.totalComments, 10),
      totalLikes: Number.parseInt(result.totalLikes, 10),
    };
  }

  private toModel(entity: WeiboCommentEntity): WeiboCommentModel {
    return {
      id: entity.id,
      commentId: entity.commentId,
      mid: entity.mid,
      postId: entity.postId,
      author: {
        id: entity.author.id,
        weiboId: entity.author.weiboId,
        screenName: entity.author.screenName,
        profileImageUrl: entity.author.profileImageUrl,
        verified: entity.author.verified,
        verifiedReason: entity.author.verifiedReason ?? undefined,
        followersCount: entity.author.followersCount,
        friendsCount: entity.author.friendsCount,
        statusesCount: entity.author.statusesCount,
        gender: entity.author.gender ?? undefined,
        location: entity.author.location ?? undefined,
        description: entity.author.description ?? undefined,
      },
      text: entity.text,
      createdAt: entity.createdAt,
      likeCounts: entity.likeCounts,
      liked: entity.liked,
      source: entity.source ?? undefined,
      replyCommentId: entity.replyCommentId ?? undefined,
      isMblogAuthor: entity.isMblogAuthor,
    };
  }
}
