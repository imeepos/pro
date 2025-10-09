import { IsString, IsOptional, IsInt, IsEnum, MaxLength } from 'class-validator';
import { MediaTypeStatus } from '../../entities/media-type.entity';

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
