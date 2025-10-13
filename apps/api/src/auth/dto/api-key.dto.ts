import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsIn,
  IsArray,
  ValidateIf
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyType } from '@pro/entities';

// 重新导出，以便其他地方使用
export { ApiKeyType };

/**
 * API Key状态枚举
 */
export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  ALL = 'all'
}


/**
 * API Key排序字段枚举
 */
export enum ApiKeySortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  LAST_USED_AT = 'lastUsedAt',
  USAGE_COUNT = 'usageCount'
}

/**
 * API Key排序方向枚举
 */
export enum ApiKeySortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * 创建API Key DTO
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API Key名称',
    maxLength: 100,
    example: '生产环境API Key'
  })
  @IsString()
  @MaxLength(100, { message: 'API Key名称长度不能超过100个字符' })
  name: string;

  @ApiPropertyOptional({
    description: 'API Key描述',
    maxLength: 500,
    example: '用于生产环境数据访问的API密钥'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述长度不能超过500个字符' })
  description?: string;

  @ApiProperty({
    description: 'API Key类型',
    enum: ApiKeyType,
    example: ApiKeyType.READ_ONLY
  })
  @IsEnum(ApiKeyType, { message: 'API Key类型无效' })
  type: ApiKeyType;

  @ApiPropertyOptional({
    description: '过期时间（ISO 8601格式），null表示永不过期',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @ValidateIf(o => o.expiresAt !== null)
  @IsDateString({}, { message: '过期时间格式无效' })
  expiresAt?: string | null;

  @ApiPropertyOptional({
    description: '权限列表',
    type: [String],
    example: ['read:events', 'read:users']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/**
 * 更新API Key DTO
 */
export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'API Key名称',
    maxLength: 100,
    example: '更新后的API Key名称'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'API Key名称长度不能超过100个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: 'API Key描述',
    maxLength: 500,
    example: '更新后的API密钥描述'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述长度不能超过500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: 'API Key类型',
    enum: ApiKeyType,
    example: ApiKeyType.READ_WRITE
  })
  @IsOptional()
  @IsEnum(ApiKeyType, { message: 'API Key类型无效' })
  type?: ApiKeyType;

  @ApiPropertyOptional({
    description: '过期时间（ISO 8601格式），null表示永不过期',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @ValidateIf(o => o.expiresAt !== null)
  @IsDateString({}, { message: '过期时间格式无效' })
  expiresAt?: string | null;

  @ApiPropertyOptional({
    description: '权限列表',
    type: [String],
    example: ['read:events', 'write:events', 'read:users']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: '是否启用',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * API Key查询DTO
 */
export class ApiKeyQueryDto {
  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '搜索关键词（匹配名称）',
    example: '生产环境'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'API Key状态',
    enum: ApiKeyStatus,
    example: ApiKeyStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(ApiKeyStatus, { message: 'API Key状态无效' })
  status?: ApiKeyStatus;

  @ApiPropertyOptional({
    description: '是否显示已过期的Key',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeExpired?: boolean = false;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ApiKeySortBy,
    example: ApiKeySortBy.CREATED_AT
  })
  @IsOptional()
  @IsEnum(ApiKeySortBy, { message: '排序字段无效' })
  sortBy?: ApiKeySortBy = ApiKeySortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ApiKeySortOrder,
    example: ApiKeySortOrder.DESC
  })
  @IsOptional()
  @IsEnum(ApiKeySortOrder, { message: '排序方向无效' })
  sortOrder?: ApiKeySortOrder = ApiKeySortOrder.DESC;

  @ApiPropertyOptional({
    description: '开始日期（ISO 8601格式）',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式无效' })
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期（ISO 8601格式）',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式无效' })
  endDate?: string;
}

/**
 * API Key响应DTO
 */
export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API Key ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'API Key（部分隐藏）',
    example: 'ak_12345678...abcd'
  })
  key: string;

  @ApiProperty({ description: 'API Key名称', example: '生产环境API Key' })
  name: string;

  @ApiPropertyOptional({ description: 'API Key描述', example: '用于生产环境数据访问的API密钥' })
  description?: string;

  @ApiProperty({ description: 'API Key类型', enum: ApiKeyType, example: ApiKeyType.READ_ONLY })
  type: ApiKeyType;

  @ApiPropertyOptional({ description: '权限列表', type: [String], example: ['read:events', 'read:users'] })
  permissions?: string[];

  @ApiProperty({ description: '是否启用', example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: '最后使用时间',
    example: '2024-01-15T10:30:00.000Z'
  })
  lastUsedAt?: Date;

  @ApiProperty({ description: '使用次数', example: 42 })
  usageCount: number;

  @ApiPropertyOptional({
    description: '过期时间',
    example: '2024-12-31T23:59:59.000Z'
  })
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: '创建IP地址',
    example: '192.168.1.100'
  })
  createdIp?: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ description: '是否已过期', example: false })
  isExpired: boolean;

  @ApiProperty({ description: '是否有效', example: true })
  isValid: boolean;
}

/**
 * API Key列表响应DTO
 */
export class ApiKeyListResponseDto {
  @ApiProperty({ description: 'API Key列表', type: [ApiKeyResponseDto] })
  items: ApiKeyResponseDto[];

  @ApiProperty({ description: '总数量', example: 25 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 3 })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页', example: false })
  hasPrev: boolean;
}

/**
 * API Key使用统计DTO
 */
export class ApiKeyStatsDto {
  @ApiProperty({ description: 'API Key ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'API Key名称', example: '生产环境API Key' })
  name: string;

  @ApiProperty({ description: '总使用次数', example: 1234 })
  usageCount: number;

  @ApiPropertyOptional({
    description: '最后使用时间',
    example: '2024-01-15T10:30:00.000Z'
  })
  lastUsedAt?: Date;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '使用天数', example: 15 })
  daysSinceCreation: number;

  @ApiProperty({ description: '平均每日使用次数', example: 82.26 })
  averageDailyUsage: number;
}

/**
 * API Key汇总统计DTO
 */
export class ApiKeySummaryStatsDto {
  @ApiProperty({ description: '总数量', example: 25 })
  total: number;

  @ApiProperty({ description: '活跃数量', example: 18 })
  active: number;

  @ApiProperty({ description: '非活跃数量', example: 5 })
  inactive: number;

  @ApiProperty({ description: '已过期数量', example: 2 })
  expired: number;

  @ApiProperty({ description: '从未使用数量', example: 3 })
  neverUsed: number;

  @ApiProperty({ description: '即将过期数量（7天内）', example: 1 })
  expiringSoon: number;

  @ApiProperty({ description: '总使用次数', example: 12456 })
  totalUsage: number;

  @ApiProperty({ description: '平均每日使用次数', example: 85.67 })
  averageDailyUsage: number;

  @ApiPropertyOptional({
    description: '使用次数最多的API Key',
    type: () => ApiKeyStatsDto
  })
  mostUsed?: ApiKeyStatsDto;

  @ApiPropertyOptional({
    description: '最近使用的API Key',
    type: () => ApiKeyStatsDto
  })
  recentlyUsed?: ApiKeyStatsDto;
}

/**
 * 重新生成API Key响应DTO
 */
export class RegenerateApiKeyDto {
  @ApiProperty({
    description: '新的API Key',
    example: 'ak_abcdef1234567890abcdef1234567890'
  })
  key: string;

  @ApiProperty({
    description: '警告：请立即保存新的API Key，它只会显示一次',
    example: '请立即保存此API Key，页面刷新后将无法再次查看完整密钥'
  })
  warning: string;
}