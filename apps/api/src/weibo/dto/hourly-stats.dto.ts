import { Type } from 'class-transformer';
import { IsEnum, IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { HourlyStatsType } from '../interfaces/hourly-stats.interface';

/**
 * 小时统计查询DTO
 */
export class HourlyStatsQueryDto {
  /**
   * 统计类型
   */
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 开始日期
   */
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  /**
   * 聚合间隔 (可选，默认 hour)
   */
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'], { message: '无效的聚合间隔' })
  interval?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * 多类型统计查询DTO
 */
export class MultiTypeStatsQueryDto {
  /**
   * 统计类型列表
   */
  @IsEnum(HourlyStatsType, { each: true, message: '无效的统计类型' })
  types: HourlyStatsType[];

  /**
   * 开始日期
   */
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

/**
 * 统计聚合查询DTO
 */
export class StatsAggregationQueryDto {
  /**
   * 统计类型
   */
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 开始日期
   */
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  /**
   * 结束日期
   */
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  /**
   * 聚合间隔
   */
  @IsEnum(['day', 'week', 'month'], { message: '无效的聚合间隔' })
  interval: 'day' | 'week' | 'month';

  /**
   * 时区 (可选，默认 Asia/Shanghai)
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

/**
 * 统计记录DTO
 */
export class HourlyStatsRecordDto {
  /**
   * 统计类型
   */
  @IsEnum(HourlyStatsType, { message: '无效的统计类型' })
  type: HourlyStatsType;

  /**
   * 时间戳
   */
  @Type(() => Date)
  timestamp: Date;

  /**
   * 统计数量
   */
  count: number;

  /**
   * 额外元数据 (可选)
   */
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 批量统计记录DTO
 */
export class BatchHourlyStatsRecordDto {
  /**
   * 统计记录列表
   */
  records: HourlyStatsRecordDto[];
}