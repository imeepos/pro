import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsInt,
  IsIn,
  MaxLength,
  Min,
  Max,
  Matches,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { WeiboSearchTaskStatus } from '@pro/entities';

/**
 * 创建微博搜索任务DTO
 */
@InputType('CreateWeiboSearchTaskInput')
export class CreateWeiboSearchTaskDto {
  @IsString()
  @MaxLength(100, { message: '关键词长度不能超过100个字符' })
  @Field(() => String)
  keyword: string;

  @IsDateString({}, { message: '请提供有效的起始时间格式' })
  @Field(() => String)
  startDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/, {
    message: '抓取间隔格式错误，请使用如: 30m, 1h, 1d 格式',
  })
  @MaxLength(20, { message: '抓取间隔长度不能超过20个字符' })
  @Field(() => String, { nullable: true })
  crawlInterval?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '账号ID必须是整数' })
  @Min(1, { message: '账号ID必须大于0' })
  @Field(() => Int, { nullable: true })
  weiboAccountId?: number;

  @IsOptional()
  @IsBoolean({ message: '账号轮换设置必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  enableAccountRotation?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '无数据阈值必须是整数' })
  @Min(1, { message: '无数据阈值至少为1' })
  @Max(10, { message: '无数据阈值不能超过10' })
  @Field(() => Int, { nullable: true })
  noDataThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '最大重试次数必须是整数' })
  @Min(0, { message: '最大重试次数不能为负数' })
  @Max(5, { message: '最大重试次数不能超过5' })
  @Field(() => Int, { nullable: true })
  maxRetries?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围必须在-180到180之间' })
  @Max(180, { message: '经度范围必须在-180到180之间' })
  @Field(() => Number, { nullable: true })
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围必须在-90到90之间' })
  @Max(90, { message: '纬度范围必须在-90到90之间' })
  @Field(() => Number, { nullable: true })
  latitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '位置地址长度不能超过500个字符' })
  @Field(() => String, { nullable: true })
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '位置名称长度不能超过200个字符' })
  @Field(() => String, { nullable: true })
  locationName?: string;
}

/**
 * 更新微博搜索任务DTO
 */
@InputType('UpdateWeiboSearchTaskInput')
export class UpdateWeiboSearchTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '关键词长度不能超过100个字符' })
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsDateString({}, { message: '请提供有效的起始时间格式' })
  @Field(() => String, { nullable: true })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/, {
    message: '抓取间隔格式错误，请使用如: 30m, 1h, 1d 格式',
  })
  @MaxLength(20, { message: '抓取间隔长度不能超过20个字符' })
  @Field(() => String, { nullable: true })
  crawlInterval?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '账号ID必须是整数' })
  @Min(1, { message: '账号ID必须大于0' })
  @Field(() => Int, { nullable: true })
  weiboAccountId?: number;

  @IsOptional()
  @IsBoolean({ message: '账号轮换设置必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  enableAccountRotation?: boolean;

  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;

  @IsOptional()
  @IsIn(Object.values(WeiboSearchTaskStatus), {
    message: '任务状态值无效',
  })
  @Field(() => WeiboSearchTaskStatus, { nullable: true })
  status?: WeiboSearchTaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '无数据阈值必须是整数' })
  @Min(1, { message: '无数据阈值至少为1' })
  @Max(10, { message: '无数据阈值不能超过10' })
  @Field(() => Int, { nullable: true })
  noDataThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '最大重试次数必须是整数' })
  @Min(0, { message: '最大重试次数不能为负数' })
  @Max(5, { message: '最大重试次数不能超过5' })
  @Field(() => Int, { nullable: true })
  maxRetries?: number;

  @IsOptional()
  @IsBoolean({ message: '重置重试次数标志必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  resetRetryCount?: boolean;

  @IsOptional()
  @IsBoolean({ message: '重置无数据计数标志必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  resetNoDataCount?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '总段数必须是整数' })
  @Min(0, { message: '总段数不能为负数' })
  @Field(() => Int, { nullable: true })
  totalSegments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围必须在-180到180之间' })
  @Max(180, { message: '经度范围必须在-180到180之间' })
  @Field(() => Number, { nullable: true })
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围必须在-90到90之间' })
  @Max(90, { message: '纬度范围必须在-90到90之间' })
  @Field(() => Number, { nullable: true })
  latitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '位置地址长度不能超过500个字符' })
  @Field(() => String, { nullable: true })
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '位置名称长度不能超过200个字符' })
  @Field(() => String, { nullable: true })
  locationName?: string;
}

/**
 * 暂停任务DTO
 */
@InputType('PauseWeiboTaskInput')
export class PauseTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '暂停原因长度不能超过500个字符' })
  @Field(() => String, { nullable: true })
  reason?: string;
}

/**
 * 恢复任务DTO
 */
@InputType('ResumeWeiboTaskInput')
export class ResumeTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '恢复原因长度不能超过500个字符' })
  @Field(() => String, { nullable: true })
  reason?: string;
}

/**
 * 立即执行任务DTO
 */
@InputType('RunWeiboTaskNowInput')
export class RunNowTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '执行原因长度不能超过500个字符' })
  @Field(() => String, { nullable: true })
  reason?: string;
}

/**
 * 任务查询参数DTO
 */
@InputType('WeiboSearchTaskFilterInput')
export class QueryTaskDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  @Field(() => Int, { nullable: true })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  @Max(100, { message: '每页数量不能超过100' })
  @Field(() => Int, { nullable: true })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '搜索关键词长度不能超过100个字符' })
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsIn(Object.values(WeiboSearchTaskStatus), {
    message: '任务状态值无效',
  })
  @Field(() => WeiboSearchTaskStatus, { nullable: true })
  status?: WeiboSearchTaskStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '启用状态筛选必须是布尔值' })
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'startDate', 'nextRunAt', 'progress'], {
    message: '排序字段无效',
  })
  @Field(() => String, { nullable: true })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'], {
    message: '排序方向必须是 ASC 或 DESC',
  })
  @Field(() => String, { nullable: true })
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}
