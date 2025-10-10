import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

/**
 * 创建API Key DTO
 */
export class CreateApiKeyDto {
  @IsString()
  @MaxLength(100, { message: 'API Key名称长度不能超过100个字符' })
  name: string;

  @IsOptional()
  @IsDateString({}, { message: '过期时间格式无效' })
  expiresAt?: string;
}

/**
 * 更新API Key DTO
 */
export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'API Key名称长度不能超过100个字符' })
  name?: string;

  @IsOptional()
  @IsDateString({}, { message: '过期时间格式无效' })
  expiresAt?: string;

  @IsOptional()
  isActive?: boolean;
}