import { Type } from 'class-transformer';
import { IsEnum, IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { InputType, Field, Int } from '@nestjs/graphql';
import { HourlyStatsType } from './hourly-stats-type.enum';
import { GraphQLJSON } from 'graphql-type-json';

/**
 * 小时统计查询DTO
 */
@InputType()
export class HourlyStatsQueryDto {
  /**
   * 统计类型
   */
  @Field(() => HourlyStatsType)
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 开始日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  /**
   * 聚合间隔 (可选，默认 hour)
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'], { message: '无效的聚合间隔' })
  interval?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * 多类型统计查询DTO
 */
@InputType()
export class MultiTypeStatsQueryDto {
  /**
   * 统计类型列表
   */
  @Field(() => [HourlyStatsType])
  @IsEnum(HourlyStatsType, { each: true, message: '无效的统计类型' })
  types: HourlyStatsType[];

  /**
   * 开始日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

/**
 * 统计聚合查询DTO
 */
@InputType()
export class StatsAggregationQueryDto {
  /**
   * 统计类型
   */
  @Field(() => HourlyStatsType)
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 开始日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @Field(() => Date)
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 聚合间隔
   */
  @Field(() => String)
  @IsEnum(['day', 'week', 'month'], { message: '无效的聚合间隔' })
  interval: 'day' | 'week' | 'month';

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

/**
 * 统计记录DTO
 */
@InputType()
export class HourlyStatsRecordDto {
  /**
   * 统计类型
   */
  @Field(() => HourlyStatsType)
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 时间戳
   */
  @Field(() => Date)
  @Type(() => Date)
  timestamp: Date;

  /**
   * 统计数量
   */
  @Field(() => Int)
  count: number;

  /**
   * 额外元数据 (可选)
   */
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 批量统计记录DTO
 */
@InputType()
export class BatchHourlyStatsRecordDto {
  /**
   * 统计记录列表
   */
  @Field(() => [HourlyStatsRecordDto])
  records: HourlyStatsRecordDto[];
}