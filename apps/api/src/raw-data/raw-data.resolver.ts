import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import {
  RawDataFilterDto,
  RawDataStatisticsDto,
  TrendDataInput,
  TrendDataPointDto,
  RawDataItemDto,
  PaginatedRawDataDto,
} from './dto/raw-data.dto';
import { SourceType } from '@pro/types';
import { RawDataService } from './raw-data.service';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PinoLogger } from '@pro/logger-nestjs';

/**
 * 原始数据 GraphQL 解析器
 * 提供安全的原始数据查询接口，支持用户级别的数据访问控制
 */
@Resolver(() => RawDataItemDto)
@UseGuards(CompositeAuthGuard)
export class RawDataResolver {
  constructor(
    private readonly rawDataService: RawDataService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RawDataResolver.name);
  }

  /**
   * 查询原始数据列表
   */
  @Query(() => PaginatedRawDataDto, {
    name: 'rawDataList',
    description: '获取原始数据列表，支持分页和过滤'
  })
  async findRawDataList(
    @CurrentUser('userId') userId: string,
    @Args('filter', { type: () => RawDataFilterDto, nullable: true })
    filter?: RawDataFilterDto,
  ): Promise<PaginatedRawDataDto> {
    this.logger.debug('获取原始数据列表', { userId, filter: filter || {} });

    try {
      const result = await this.rawDataService.findRawData(filter || {});
      this.logger.debug('原始数据列表查询成功', {
        userId,
        resultCount: result.items.length,
        total: result.total
      });
      return result;
    } catch (error) {
      this.logger.error('获取原始数据列表失败', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 根据ID查询单个原始数据
   */
  @Query(() => RawDataItemDto, {
    name: 'rawDataById',
    description: '根据ID获取单个原始数据',
    nullable: true
  })
  async findRawDataById(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => String, description: '数据ID' })
    id: string,
  ): Promise<RawDataItemDto | null> {
    this.logger.debug('查询原始数据详情', { userId, id });

    try {
      const result = await this.rawDataService.findRawDataById(id);
      if (!result) {
        throw new NotFoundException('原始数据不存在');
      }

      this.logger.debug('原始数据详情查询成功', {
        userId,
        id,
        sourceType: result.sourceType,
        sourceUrl: result.sourceUrl
      });
      return result;
    } catch (error) {
      this.logger.error('获取原始数据详情失败', { userId, id, error: error.message });
      throw error;
    }
  }

  /**
   * 获取数据统计信息
   */
  @Query(() => RawDataStatisticsDto, {
    name: 'rawDataStatistics',
    description: '获取原始数据的统计信息'
  })
  async getStatistics(
    @CurrentUser('userId') userId: string,
  ): Promise<RawDataStatisticsDto> {
    this.logger.debug('获取原始数据统计信息', { userId });

    try {
      const result = await this.rawDataService.getStatistics();
      this.logger.debug('原始数据统计信息获取成功', {
        userId,
        total: result.total
      });
      return result;
    } catch (error) {
      this.logger.error('获取原始数据统计信息失败', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 获取趋势数据
   */
  @Query(() => [TrendDataPointDto], {
    name: 'rawDataTrend',
    description: '获取原始数据的趋势分析数据'
  })
  async getTrendData(
    @CurrentUser('userId') userId: string,
    @Args('input', { type: () => TrendDataInput, nullable: true })
    input?: TrendDataInput,
  ): Promise<TrendDataPointDto[]> {
    this.logger.debug('获取原始数据趋势分析', { userId, input: input || {} });

    try {
      const result = await this.rawDataService.getTrendData(input || {});
      this.logger.debug('原始数据趋势分析获取成功', {
        userId,
        dataPointCount: result.length
      });
      return result;
    } catch (error) {
      this.logger.error('获取原始数据趋势分析失败', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 根据数据源类型查询数据
   */
  @Query(() => PaginatedRawDataDto, {
    name: 'rawDataBySourceType',
    description: '根据数据源类型查询原始数据'
  })
  async findRawDataBySourceType(
    @CurrentUser('userId') userId: string,
    @Args('sourceType', { type: () => SourceType, description: '数据源类型' })
    sourceType: SourceType,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 })
    pageSize?: number,
  ): Promise<PaginatedRawDataDto> {
    const normalizedPageSize = Math.min(pageSize || 20, 100);
    const filter: RawDataFilterDto = {
      sourceType,
      page: page || 1,
      pageSize: normalizedPageSize,
    };

    this.logger.debug('按数据源类型查询原始数据', {
      userId,
      sourceType,
      page: filter.page,
      pageSize: filter.pageSize
    });

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug('按数据源类型查询成功', {
        userId,
        sourceType,
        resultCount: result.items.length,
        total: result.total
      });
      return result;
    } catch (error) {
      this.logger.error('按数据源类型查询失败', { userId, sourceType, error: error.message });
      throw error;
    }
  }

  /**
   * 搜索原始数据
   */
  @Query(() => PaginatedRawDataDto, {
    name: 'searchRawData',
    description: '搜索原始数据'
  })
  async searchRawData(
    @CurrentUser('userId') userId: string,
    @Args('keyword', { type: () => String, description: '搜索关键词' })
    keyword: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 })
    pageSize?: number,
  ): Promise<PaginatedRawDataDto> {
    const normalizedPageSize = Math.min(pageSize || 20, 100);
    const filter: RawDataFilterDto = {
      keyword,
      page: page || 1,
      pageSize: normalizedPageSize,
    };

    this.logger.debug('搜索原始数据', {
      userId,
      keyword,
      page: filter.page,
      pageSize: filter.pageSize
    });

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug('原始数据搜索成功', {
        userId,
        keyword,
        resultCount: result.items.length,
        total: result.total
      });
      return result;
    } catch (error) {
      this.logger.error('搜索原始数据失败', { userId, keyword, error: error.message });
      throw error;
    }
  }

  /**
   * 获取最近的数据
   */
  @Query(() => [RawDataItemDto], {
    name: 'recentRawData',
    description: '获取最近的原始数据'
  })
  async getRecentRawData(
    @CurrentUser('userId') userId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
    limit?: number,
    @Args('sourceType', { type: () => SourceType, nullable: true })
    sourceType?: SourceType,
  ): Promise<RawDataItemDto[]> {
    const normalizedLimit = Math.min(limit || 10, 50);
    const filter: RawDataFilterDto = {
      sourceType,
      page: 1,
      pageSize: normalizedLimit,
    };

    this.logger.debug('获取最近的原始数据', {
      userId,
      limit: normalizedLimit,
      sourceType: sourceType || '全部'
    });

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug('最近原始数据获取成功', {
        userId,
        resultCount: result.items.length,
        sourceType: sourceType || '全部'
      });
      return result.items;
    } catch (error) {
      this.logger.error('获取最近原始数据失败', { userId, sourceType, error: error.message });
      throw error;
    }
  }
}