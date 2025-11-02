import { Injectable, NotFoundException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
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
        .createQueryBuilder('interaction');

      this.applyFilters(qb, filter);
      this.applySort(qb, sort);

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

  private applyFilters(
    qb: SelectQueryBuilder<WeiboInteractionEntity>,
    filter?: InteractionFilterDto,
  ): void {
    if (!filter) return;

    if (filter.interactionType) {
      qb.andWhere('interaction.interaction_type = :interactionType', {
        interactionType: filter.interactionType,
      });
    }

    if (filter.targetType) {
      qb.andWhere('interaction.target_type = :targetType', {
        targetType: filter.targetType,
      });
    }

    if (filter.userWeiboId) {
      qb.andWhere('interaction.user_weibo_id = :userWeiboId', {
        userWeiboId: filter.userWeiboId,
      });
    }

    if (filter.targetWeiboId) {
      qb.andWhere('interaction.target_weibo_id = :targetWeiboId', {
        targetWeiboId: filter.targetWeiboId,
      });
    }

    if (filter.dateFrom) {
      qb.andWhere('interaction.created_at >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      qb.andWhere('interaction.created_at <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }
  }

  private applySort(qb: SelectQueryBuilder<WeiboInteractionEntity>, sort?: SortDto): void {
    const sortField = sort?.field ?? 'createdAt';
    const sortOrder = sort?.order ?? 'DESC';

    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      interactionType: 'interaction_type',
      targetType: 'target_type',
    };

    const column = columnMap[sortField] ?? columnMap.createdAt;
    qb.orderBy(`interaction.${column}`, sortOrder as 'ASC' | 'DESC');
  }

  async findInteractionById(id: string): Promise<WeiboInteractionEntity | null> {
    return useEntityManager(async (m) => {
      const interaction = await m.getRepository(WeiboInteractionEntity).findOne({
        where: { id },
        relations: ['post', 'comment'],
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
        .select('interaction.interaction_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('interaction.interaction_type');

      this.applyFilters(qb, filter);

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
