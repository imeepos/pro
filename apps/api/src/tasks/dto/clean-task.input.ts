import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { SourceType, TaskPriority } from '@pro/types';

/**
 * 清洗任务输入
 *
 * 设计原则：
 * - 只包含触发任务所需的必要字段
 * - 利用 class-validator 确保数据完整性
 * - GraphQL 装饰器与验证器结合，类型安全与运行时验证并重
 */
@InputType()
export class CleanTaskInput {
  @Field(() => String, { description: 'MongoDB 原始数据文档 ID' })
  @IsNotEmpty({ message: 'rawDataId 不能为空' })
  @IsString()
  rawDataId: string;

  @Field(() => String, { description: '数据源类型' })
  @IsEnum(SourceType, { message: '无效的数据源类型' })
  sourceType: SourceType;

  @Field(() => String, {
    description: '任务优先级',
    defaultValue: TaskPriority.NORMAL,
  })
  @IsEnum(TaskPriority, { message: '无效的任务优先级' })
  @IsOptional()
  priority?: TaskPriority;
}
