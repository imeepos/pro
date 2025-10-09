import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventTypeDto {
  @IsString()
  @MaxLength(50)
  eventCode: string;

  @IsString()
  @MaxLength(100)
  eventName: string;

  @IsString()
  industryId: string;

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

export class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eventCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventName?: string;

  @IsOptional()
  @IsString()
  industryId?: string;

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
