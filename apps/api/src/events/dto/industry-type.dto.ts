import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIndustryTypeDto {
  @IsString()
  @MaxLength(50)
  industryCode: string;

  @IsString()
  @MaxLength(100)
  industryName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateIndustryTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industryName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}
