import { Field, ID, InputType, ObjectType, Int, Float, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessingStatus, SourceType, SourcePlatform } from '@pro/types';

registerEnumType(ProcessingStatus, {
  name: 'ProcessingStatus',
  description: '原始数据处理状态',
});

registerEnumType(SourceType, {
  name: 'SourceType',
  description: '数据源类型',
});

registerEnumType(SourcePlatform, {
  name: 'SourcePlatform',
  description: '数据源平台',
});

/**
 * 时间范围过滤器
 */
@InputType('TimeRangeInput')
export class TimeRangeFilter {
  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true, description: '开始时间' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true, description: '结束时间' })
  endDate?: string;
}

/**
 * 原始数据查询过滤器
 */
@InputType('RawDataFilterInput')
export class RawDataFilterDto {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, description: '关键词搜索' })
  keyword?: string;

  @IsOptional()
  @IsEnum(SourceType)
  @Field(() => SourceType, { nullable: true, description: '数据源类型' })
  sourceType?: SourceType;

  @IsOptional()
  @IsEnum(SourcePlatform)
  @Field(() => SourcePlatform, { nullable: true, description: '数据源平台' })
  sourcePlatform?: SourcePlatform;

  @IsOptional()
  @IsEnum(ProcessingStatus)
  @Field(() => ProcessingStatus, { nullable: true, description: '处理状态' })
  status?: ProcessingStatus;

  @IsOptional()
  @Type(() => TimeRangeFilter)
  @Field(() => TimeRangeFilter, { nullable: true, description: '时间范围' })
  timeRange?: TimeRangeFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true, description: '页码' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Field(() => Int, { nullable: true, description: '每页数量' })
  pageSize?: number = 20;
}

/**
 * 原始数据统计信息
 */
@ObjectType('RawDataStatistics')
export class RawDataStatisticsDto {
  @Field(() => Int, { description: '待处理数据量' })
  pending: number;

  @Field(() => Int, { description: '处理中数据量' })
  processing: number;

  @Field(() => Int, { description: '已完成数据量' })
  completed: number;

  @Field(() => Int, { description: '失败数据量' })
  failed: number;

  @Field(() => Int, { description: '总数据量' })
  total: number;

  @Field(() => Float, { description: '成功率' })
  successRate: number;
}

/**
 * 趋势数据点
 */
@ObjectType('TrendDataPoint')
export class TrendDataPointDto {
  @Field(() => String, { description: '时间点' })
  timestamp: string;

  @Field(() => Int, { description: '数据量' })
  count: number;

  @Field(() => ProcessingStatus, { description: '状态' })
  status: ProcessingStatus;
}

/**
 * 趋势数据查询参数
 */
@InputType('TrendDataInput')
export class TrendDataInput {
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  @Field(() => String, { nullable: true, description: '聚合粒度' })
  granularity?: 'hour' | 'day' | 'week' | 'month' = 'day';

  @IsOptional()
  @Type(() => TimeRangeFilter)
  @Field(() => TimeRangeFilter, { nullable: true, description: '时间范围' })
  timeRange?: TimeRangeFilter;

  @IsOptional()
  @IsEnum(ProcessingStatus)
  @Field(() => ProcessingStatus, { nullable: true, description: '状态过滤' })
  status?: ProcessingStatus;
}

/**
 * 原始数据项
 */
@ObjectType('RawDataItem')
export class RawDataItemDto {
  @Field(() => ID, { description: '数据ID' })
  _id: string;

  @Field(() => SourceType, { description: '数据源类型' })
  sourceType: SourceType;

  @Field(() => String, { description: '源链接' })
  sourceUrl: string;

  @Field(() => String, { description: '内容摘要' })
  contentPreview: string;

  @Field(() => String, { description: '内容哈希' })
  contentHash: string;

  @Field(() => ProcessingStatus, { description: '处理状态' })
  status: ProcessingStatus;

  @Field(() => String, { nullable: true, description: '错误信息' })
  errorMessage?: string;

  @Field(() => String, { description: '创建时间' })
  createdAt: string;

  @Field(() => String, { nullable: true, description: '处理时间' })
  processedAt?: string;

  @Field(() => String, { description: '元数据' })
  metadata: string;
}

/**
 * 分页响应包装器
 */
@ObjectType('PaginatedRawData')
export class PaginatedRawDataDto {
  @Field(() => [RawDataItemDto], { description: '数据列表' })
  items: RawDataItemDto[];

  @Field(() => Int, { description: '总数量' })
  total: number;

  @Field(() => Int, { description: '当前页码' })
  page: number;

  @Field(() => Int, { description: '每页数量' })
  pageSize: number;

  @Field(() => Int, { description: '总页数' })
  totalPages: number;

  @Field(() => Boolean, { description: '是否有下一页' })
  hasNext: boolean;

  @Field(() => Boolean, { description: '是否有上一页' })
  hasPrevious: boolean;
}