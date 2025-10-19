import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsEnum, IsArray, ArrayMinSize, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { TimeWindowType, AggregateMetric } from '@pro/types';

/**
 * 聚合任务输入
 *
 * 设计原则：
 * - 时间边界明确：使用 ISO 8601 格式确保时区一致性
 * - 灵活的指标选择：通过 metrics 数组避免冗余计算
 * - 可选配置：提供合理默认值，减少用户输入负担
 */
@InputType()
export class AggregateTaskInput {
  @Field(() => String, { description: '时间窗口类型 (hour/day/week/month)' })
  @IsEnum(TimeWindowType, { message: '无效的时间窗口类型' })
  windowType: TimeWindowType;

  @Field(() => String, { description: '窗口开始时间 (ISO 8601 格式)' })
  @IsNotEmpty({ message: 'startTime 不能为空' })
  @IsDateString({}, { message: 'startTime 必须是有效的 ISO 8601 日期时间' })
  startTime: string;

  @Field(() => String, { description: '窗口结束时间 (ISO 8601 格式)' })
  @IsNotEmpty({ message: 'endTime 不能为空' })
  @IsDateString({}, { message: 'endTime 必须是有效的 ISO 8601 日期时间' })
  endTime: string;

  @Field(() => [String], { description: '需要计算的聚合指标列表' })
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一种聚合指标' })
  @IsEnum(AggregateMetric, { each: true, message: '无效的聚合指标类型' })
  metrics: AggregateMetric[];

  @Field(() => String, {
    description: '可选：过滤关键词',
    nullable: true,
  })
  @IsOptional()
  keyword?: string;

  @Field(() => Int, {
    description: '可选：Top N 数量 (默认 10)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'topN 必须大于 0' })
  topN?: number;

  @Field(() => Boolean, {
    description: '可选：是否强制重新计算 (默认 false)',
    nullable: true,
  })
  @IsOptional()
  forceRecalculate?: boolean;
}
