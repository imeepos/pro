import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ConfigType {
  AMAP_API_KEY = 'amap_api_key',
}

export class GetConfigDto {
  @IsEnum(ConfigType, { message: '配置类型必须是有效的枚举值' })
  type: ConfigType;
}

export class ConfigResponseDto {
  @IsString({ message: '配置值必须是字符串' })
  value: string;

  @IsOptional()
  @IsString({ message: '缓存过期时间必须是字符串' })
  expiresAt?: string;
}