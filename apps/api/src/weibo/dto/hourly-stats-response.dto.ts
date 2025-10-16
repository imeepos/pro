import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/**
 * 小时统计数据点 GraphQL 对象类型
 */
@ObjectType('HourlyStatsPoint')
export class HourlyStatsPointDto {
  /** 时间点 (ISO 8601格式) */
  @Field(() => String, { description: '时间点 (ISO 8601格式)' })
  hour: string;

  /** 统计数量 */
  @Field(() => Int, { description: '统计数量' })
  count: number;

  /** 占比 (可选) */
  @Field(() => Float, { description: '占比 (可选)', nullable: true })
  percentage?: number;

  /** 趋势 (可选) */
  @Field(() => String, { description: '趋势 (可选)', nullable: true })
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 小时统计时间范围 GraphQL 对象类型
 */
@ObjectType('HourlyStatsTimeRange')
export class HourlyStatsTimeRangeDto {
  /** 开始时间 */
  @Field(() => String, { description: '开始时间' })
  start: string;

  /** 结束时间 */
  @Field(() => String, { description: '结束时间' })
  end: string;

  /** 时区 */
  @Field(() => String, { description: '时区' })
  timezone: string;
}

/**
 * 小时统计峰值 GraphQL 对象类型
 */
@ObjectType('HourlyStatsPeak')
export class HourlyStatsPeakDto {
  /** 峰值时间 */
  @Field(() => String, { description: '峰值时间' })
  hour: string;

  /** 峰值数量 */
  @Field(() => Int, { description: '峰值数量' })
  count: number;
}

/**
 * 小时统计汇总信息 GraphQL 对象类型
 */
@ObjectType('HourlyStatsSummary')
export class HourlyStatsSummaryDto {
  /** 总数 */
  @Field(() => Int, { description: '总数' })
  total: number;

  /** 平均值 */
  @Field(() => Float, { description: '平均值' })
  average: number;

  /** 峰值 */
  @Field(() => HourlyStatsPeakDto, { description: '峰值' })
  peak: HourlyStatsPeakDto;

  /** 增长率 (可选) */
  @Field(() => Float, { description: '增长率 (可选)', nullable: true })
  growth?: number;
}

/**
 * 小时统计响应 GraphQL 对象类型
 */
@ObjectType('HourlyStatsResponse')
export class HourlyStatsResponseDto {
  /** 时间范围 */
  @Field(() => HourlyStatsTimeRangeDto, { description: '时间范围' })
  timeRange: HourlyStatsTimeRangeDto;

  /** 统计数据点 */
  @Field(() => [HourlyStatsPointDto], { description: '统计数据点' })
  data: HourlyStatsPointDto[];

  /** 汇总信息 */
  @Field(() => HourlyStatsSummaryDto, { description: '汇总信息' })
  summary: HourlyStatsSummaryDto;
}