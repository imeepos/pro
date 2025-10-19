import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { AnalysisType, DataType } from '@pro/types';

/**
 * 分析任务输入
 *
 * 设计原则：
 * - analysisTypes 数组：支持一次触发多种分析，减少消息开销
 * - 类型约束：确保至少选择一种分析类型
 */
@InputType()
export class AnalyzeTaskInput {
  @Field(() => String, { description: '待分析数据的 ID' })
  @IsNotEmpty({ message: 'dataId 不能为空' })
  @IsString()
  dataId: string;

  @Field(() => String, { description: '数据类型 (post/comment/user)' })
  @IsEnum(DataType, { message: '无效的数据类型' })
  dataType: DataType;

  @Field(() => [String], { description: '需要执行的分析类型列表' })
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一种分析类型' })
  @IsEnum(AnalysisType, { each: true, message: '无效的分析类型' })
  analysisTypes: AnalysisType[];

  @Field(() => String, {
    description: '可选：关联任务ID',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @Field(() => String, {
    description: '可选：关键词（微博搜索场景）',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
