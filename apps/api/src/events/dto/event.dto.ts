import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsIn,
  MaxLength,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '@pro/entities';

export class CreateEventDto {
  @IsString()
  eventTypeId: string;

  @IsString()
  industryTypeId: string;

  @IsString()
  @MaxLength(200)
  eventName: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsDateString()
  occurTime: string;

  @IsString()
  @MaxLength(50)
  province: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationText?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventName?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsDateString()
  occurTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationText?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class EventQueryDto {
  @IsOptional()
  @IsString()
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;
}

export class EventMapQueryDto {
  @IsOptional()
  @IsString()
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  keyword?: string;
}
