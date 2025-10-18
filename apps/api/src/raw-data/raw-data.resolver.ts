import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import {
  RawDataFilterDto,
  RawDataStatisticsDto,
  TrendDataInput,
  TrendDataPointDto,
  RawDataItemDto,
  PaginatedRawDataDto,
  SourceType
} from './dto/raw-data.dto';
import { RawDataService } from './raw-data.service';

/**
 * 原始数据 GraphQL 解析器
 * 提供原始数据的查询接口
 */
@Resolver(() => RawDataItemDto)
export class RawDataResolver {
  private readonly logger = new Logger(RawDataResolver.name);

  constructor(private readonly rawDataService: RawDataService) {}

  /**
   * 查询原始数据列表
   */
  @Query(() => PaginatedRawDataDto, {
    name: 'rawDataList',
    description: '获取原始数据列表，支持分页和过滤'
  })
  async findRawDataList(
    @Args('filter', { type: () => RawDataFilterDto, nullable: true })
    filter?: RawDataFilterDto,
  ): Promise<PaginatedRawDataDto> {
    this.logger.debug(`GraphQL查询: 原始数据列表, 过滤条件: ${JSON.stringify(filter || {})}`);

    try {
      const result = await this.rawDataService.findRawData(filter || {});
      this.logger.debug(`查询完成，返回 ${result.items.length} 条记录`);
      return result;
    } catch (error) {
      this.logger.error(`查询原始数据列表失败: ${error.message}`, error.stack);
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
    @Args('id', { type: () => String, description: '数据ID' })
    id: string,
  ): Promise<RawDataItemDto | null> {
    this.logger.debug(`GraphQL查询: 原始数据详情, ID: ${id}`);

    try {
      const result = await this.rawDataService.findRawDataById(id);
      this.logger.debug(`查询完成，找到数据: ${result.sourceType} - ${result.sourceUrl}`);
      return result;
    } catch (error) {
      this.logger.error(`查询原始数据详情失败, ID: ${id}, 错误: ${error.message}`, error.stack);
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
  async getStatistics(): Promise<RawDataStatisticsDto> {
    this.logger.debug('GraphQL查询: 原始数据统计信息');

    try {
      const result = await this.rawDataService.getStatistics();
      this.logger.debug(`统计查询完成: 总计 ${result.total} 条数据`);
      return result;
    } catch (error) {
      this.logger.error(`获取统计信息失败: ${error.message}`, error.stack);
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
    @Args('input', { type: () => TrendDataInput, nullable: true })
    input?: TrendDataInput,
  ): Promise<TrendDataPointDto[]> {
    this.logger.debug(`GraphQL查询: 趋势数据, 参数: ${JSON.stringify(input || {})}`);

    try {
      const result = await this.rawDataService.getTrendData(input || {});
      this.logger.debug(`趋势数据查询完成，返回 ${result.length} 个数据点`);
      return result;
    } catch (error) {
      this.logger.error(`获取趋势数据失败: ${error.message}`, error.stack);
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
    @Args('sourceType', { type: () => SourceType, description: '数据源类型' })
    sourceType: SourceType,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 })
    pageSize?: number,
  ): Promise<PaginatedRawDataDto> {
    this.logger.debug(`GraphQL查询: 按数据源类型查询, 类型: ${sourceType}, 页码: ${page}, 每页: ${pageSize}`);

    const filter: RawDataFilterDto = {
      sourceType,
      page: page || 1,
      pageSize: Math.min(pageSize || 20, 100),
    };

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug(`按类型查询完成: ${sourceType}, 返回 ${result.items.length} 条记录`);
      return result;
    } catch (error) {
      this.logger.error(`按数据源类型查询失败: ${error.message}`, error.stack);
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
    @Args('keyword', { type: () => String, description: '搜索关键词' })
    keyword: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 })
    pageSize?: number,
  ): Promise<PaginatedRawDataDto> {
    this.logger.debug(`GraphQL查询: 搜索原始数据, 关键词: ${keyword}, 页码: ${page}, 每页: ${pageSize}`);

    const filter: RawDataFilterDto = {
      keyword,
      page: page || 1,
      pageSize: Math.min(pageSize || 20, 100),
    };

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug(`搜索完成: ${keyword}, 返回 ${result.items.length} 条记录`);
      return result;
    } catch (error) {
      this.logger.error(`搜索原始数据失败: ${error.message}`, error.stack);
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
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
    limit?: number,
    @Args('sourceType', { type: () => SourceType, nullable: true })
    sourceType?: SourceType,
  ): Promise<RawDataItemDto[]> {
    this.logger.debug(`GraphQL查询: 最近数据, 限制: ${limit}, 类型: ${sourceType || '全部'}`);

    const filter: RawDataFilterDto = {
      sourceType,
      page: 1,
      pageSize: Math.min(limit || 10, 50),
    };

    try {
      const result = await this.rawDataService.findRawData(filter);
      this.logger.debug(`最近数据查询完成，返回 ${result.items.length} 条记录`);
      return result.items;
    } catch (error) {
      this.logger.error(`获取最近数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}