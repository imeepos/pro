import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';
import { WeiboInteractionEntity, useEntityManager } from '@pro/entities';
import {
  InteractionFilterDto,
  PaginationDto,
  SortDto,
} from './dto/weibo-data.dto';
import {
  WeiboInteractionConnection,
  WeiboInteractionModel,
  InteractionStatsModel,
} from './models/weibo-data.model';
import { buildOffsetConnection } from '../common/utils/pagination.utils';

@Injectable()
export class WeiboInteractionDataService {
  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboInteractionDataService.name);
  }

  async findInteractions(
    filter?: InteractionFilterDto,
    pagination?: PaginationDto,
    sort?: SortDto,
  ): Promise<WeiboInteractionConnection> {
    return useEntityManager(async (m) => {
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;

      const qb = m.getRepository(WeiboInteractionEntity)
        .createQueryBuilder('interaction')
        .leftJoinAndSelect('interaction.user', 'user')
        .leftJoinAndSelect('interaction.post', 'post')
        .leftJoinAndSelect('interaction.comment', 'comment');

      if (filter?.interactionType) {
        qb.andWhere('interaction.interactionType = :interactionType', {
          interactionType: filter.interactionType,
        });
      }

      if (filter?.targetType) {
        qb.andWhere('interaction.targetType = :targetType', {
          targetType: filter.targetType,
        });
      }

      if (filter?.userWeiboId) {
        qb.andWhere('interaction.userWeiboId = :userWeiboId', {
          userWeiboId: filter.userWeiboId,
        });
      }

      if (filter?.targetWeiboId) {
        qb.andWhere('interaction.targetWeiboId = :targetWeiboId', {
          targetWeiboId: filter.targetWeiboId,
        });
      }

      if (filter?.dateFrom || filter?.dateTo) {
        const from = filter.dateFrom ?? new Date(0);
        const to = filter.dateTo ?? new Date();
        qb.andWhere('interaction.createdAt BETWEEN :from AND :to', { from, to });
      }

      const sortField = sort?.field ?? 'createdAt';
      const sortOrder = sort?.order ?? 'DESC';
      const allowedFields = ['createdAt', 'interactionType', 'targetType'];
      const safeSortField = allowedFields.includes(sortField)
        ? sortField
        : 'createdAt';

      qb.orderBy(`interaction.${safeSortField}`, sortOrder as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      qb.skip(offset).take(limit);

      const [items, total] = await qb.getManyAndCount();

      const models = items.map((item) => this.toModel(item));

      return buildOffsetConnection(models, {
        total,
        page,
        pageSize: limit,
      });
    });
  }

  async findInteractionById(id: string): Promise<WeiboInteractionEntity | null> {
    return useEntityManager(async (m) => {
      const interaction = await m.getRepository(WeiboInteractionEntity).findOne({
        where: { id },
        relations: ['user', 'post', 'comment'],
      });

      if (!interaction) {
        throw new NotFoundException('互动记录不存在');
      }

      return interaction;
    });
  }

  async getInteractionStats(
    filter?: InteractionFilterDto,
  ): Promise<InteractionStatsModel> {
    return useEntityManager(async (m) => {
      const qb = m.getRepository(WeiboInteractionEntity)
        .createQueryBuilder('interaction')
        .select('interaction.interactionType', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('interaction.interactionType');

      if (filter?.interactionType) {
        qb.andWhere('interaction.interactionType = :interactionType', {
          interactionType: filter.interactionType,
        });
      }

      if (filter?.targetType) {
        qb.andWhere('interaction.targetType = :targetType', {
          targetType: filter.targetType,
        });
      }

      if (filter?.userWeiboId) {
        qb.andWhere('interaction.userWeiboId = :userWeiboId', {
          userWeiboId: filter.userWeiboId,
        });
      }

      if (filter?.targetWeiboId) {
        qb.andWhere('interaction.targetWeiboId = :targetWeiboId', {
          targetWeiboId: filter.targetWeiboId,
        });
      }

      if (filter?.dateFrom || filter?.dateTo) {
        const from = filter.dateFrom ?? new Date(0);
        const to = filter.dateTo ?? new Date();
        qb.andWhere('interaction.createdAt BETWEEN :from AND :to', { from, to });
      }

      const results = await qb.getRawMany<{ type: string; count: string }>();

      const stats = {
        totalLikes: 0,
        totalReposts: 0,
        totalComments: 0,
        totalFavorites: 0,
        totalInteractions: 0,
      };

      for (const row of results) {
        const count = Number(row.count);
        stats.totalInteractions += count;

        switch (row.type) {
          case 'like':
            stats.totalLikes = count;
            break;
          case 'repost':
            stats.totalReposts = count;
            break;
          case 'comment':
            stats.totalComments = count;
            break;
          case 'favorite':
            stats.totalFavorites = count;
            break;
        }
      }

      return stats;
    });
  }

  private toModel(entity: WeiboInteractionEntity): WeiboInteractionModel {
    return {
      id: entity.id,
      interactionType: entity.interactionType,
      userWeiboId: entity.userWeiboId ?? undefined,
      targetType: entity.targetType,
      targetWeiboId: entity.targetWeiboId,
      createdAt: entity.createdAt,
    };
  }
}
