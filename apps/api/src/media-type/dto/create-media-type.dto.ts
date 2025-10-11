import { IsString, IsOptional, IsInt, IsEnum, MaxLength } from 'class-validator';
import { MediaTypeStatus } from '@pro/entities';

export class CreateMediaTypeDto {
  @IsString()
  @MaxLength(50)
  typeCode: string;

  @IsString()
  @MaxLength(100)
  typeName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsEnum(MediaTypeStatus)
  status?: MediaTypeStatus;
}
