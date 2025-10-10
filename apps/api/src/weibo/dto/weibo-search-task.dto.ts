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
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WeiboSearchTaskStatus } from '../../entities/weibo-search-task.entity';

/**
 * 创建微博搜索任务DTO
 */
export class CreateWeiboSearchTaskDto {
  @IsString()
  @MaxLength(100, { message: '关键词长度不能超过100个字符' })
  keyword: string;

  @IsDateString({}, { message: '请提供有效的起始时间格式' })
  startDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/, {
    message: '抓取间隔格式错误，请使用如: 30m, 1h, 1d 格式',
  })
  @MaxLength(20, { message: '抓取间隔长度不能超过20个字符' })
  crawlInterval?: string;

  @IsOptional()
  @IsInt({ message: '账号ID必须是整数' })
  @Min(1, { message: '账号ID必须大于0' })
  weiboAccountId?: number;

  @IsOptional()
  @IsBoolean({ message: '账号轮换设置必须是布尔值' })
  enableAccountRotation?: boolean;

  @IsOptional()
  @IsInt({ message: '无数据阈值必须是整数' })
  @Min(1, { message: '无数据阈值至少为1' })
  @Max(10, { message: '无数据阈值不能超过10' })
  noDataThreshold?: number;

  @IsOptional()
  @IsInt({ message: '最大重试次数必须是整数' })
  @Min(0, { message: '最大重试次数不能为负数' })
  @Max(5, { message: '最大重试次数不能超过5' })
  maxRetries?: number;

  @IsOptional()
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围必须在-180到180之间' })
  @Max(180, { message: '经度范围必须在-180到180之间' })
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围必须在-90到90之间' })
  @Max(90, { message: '纬度范围必须在-90到90之间' })
  latitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '位置地址长度不能超过500个字符' })
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '位置名称长度不能超过200个字符' })
  locationName?: string;
}

/**
 * 更新微博搜索任务DTO
 */
export class UpdateWeiboSearchTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '关键词长度不能超过100个字符' })
  keyword?: string;

  @IsOptional()
  @IsDateString({}, { message: '请提供有效的起始时间格式' })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/, {
    message: '抓取间隔格式错误，请使用如: 30m, 1h, 1d 格式',
  })
  @MaxLength(20, { message: '抓取间隔长度不能超过20个字符' })
  crawlInterval?: string;

  @IsOptional()
  @IsInt({ message: '账号ID必须是整数' })
  @Min(1, { message: '账号ID必须大于0' })
  weiboAccountId?: number;

  @IsOptional()
  @IsBoolean({ message: '账号轮换设置必须是布尔值' })
  enableAccountRotation?: boolean;

  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  enabled?: boolean;

  @IsOptional()
  @IsIn(Object.values(WeiboSearchTaskStatus), {
    message: '任务状态值无效',
  })
  status?: WeiboSearchTaskStatus;

  @IsOptional()
  @IsInt({ message: '无数据阈值必须是整数' })
  @Min(1, { message: '无数据阈值至少为1' })
  @Max(10, { message: '无数据阈值不能超过10' })
  noDataThreshold?: number;

  @IsOptional()
  @IsInt({ message: '最大重试次数必须是整数' })
  @Min(0, { message: '最大重试次数不能为负数' })
  @Max(5, { message: '最大重试次数不能超过5' })
  maxRetries?: number;

  @IsOptional()
  @IsBoolean({ message: '重置重试次数标志必须是布尔值' })
  resetRetryCount?: boolean;

  @IsOptional()
  @IsBoolean({ message: '重置无数据计数标志必须是布尔值' })
  resetNoDataCount?: boolean;

  @IsOptional()
  @IsInt({ message: '总段数必须是整数' })
  @Min(0, { message: '总段数不能为负数' })
  totalSegments?: number;

  @IsOptional()
  @IsNumber({}, { message: '经度必须是数字' })
  @Min(-180, { message: '经度范围必须在-180到180之间' })
  @Max(180, { message: '经度范围必须在-180到180之间' })
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: '纬度必须是数字' })
  @Min(-90, { message: '纬度范围必须在-90到90之间' })
  @Max(90, { message: '纬度范围必须在-90到90之间' })
  latitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '位置地址长度不能超过500个字符' })
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '位置名称长度不能超过200个字符' })
  locationName?: string;
}

/**
 * 暂停任务DTO
 */
export class PauseTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '暂停原因长度不能超过500个字符' })
  reason?: string;
}

/**
 * 恢复任务DTO
 */
export class ResumeTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '恢复原因长度不能超过500个字符' })
  reason?: string;
}

/**
 * 立即执行任务DTO
 */
export class RunNowTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '执行原因长度不能超过500个字符' })
  reason?: string;
}

/**
 * 任务查询参数DTO
 */
export class QueryTaskDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '搜索关键词长度不能超过100个字符' })
  keyword?: string;

  @IsOptional()
  @IsIn(Object.values(WeiboSearchTaskStatus), {
    message: '任务状态值无效',
  })
  status?: WeiboSearchTaskStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '启用状态筛选必须是布尔值' })
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'startDate', 'nextRunAt', 'progress'], {
    message: '排序字段无效',
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'], {
    message: '排序方向必须是 ASC 或 DESC',
  })
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}