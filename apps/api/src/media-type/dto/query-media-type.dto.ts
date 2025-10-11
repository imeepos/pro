import { IsOptional, IsInt, IsEnum, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaTypeStatus } from '@pro/entities';

export class QueryMediaTypeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsEnum(MediaTypeStatus)
  status?: MediaTypeStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
