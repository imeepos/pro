import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Field, Float, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { EventStatus } from '@pro/entities';

registerEnumType(EventStatus, {
  name: 'EventStatus',
  description: '事件状态枚举',
});

@InputType('CreateEventInput')
export class CreateEventDto {
  @IsString()
  @Field(() => ID)
  eventTypeId: string;

  @IsString()
  @Field(() => ID)
  industryTypeId: string;

  @IsString()
  @MaxLength(200)
  @Field(() => String)
  eventName: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  summary?: string;

  @IsDateString()
  @Field(() => String)
  occurTime: string;

  @IsString()
  @MaxLength(50)
  @Field(() => String)
  province: string;

  @IsString()
  @MaxLength(50)
  @Field(() => String)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  locationText?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Field(() => Float, { nullable: true })
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Field(() => Float, { nullable: true })
  latitude?: number;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [ID], { nullable: true })
  tagIds?: string[];
}

@InputType('UpdateEventInput')
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Field(() => String, { nullable: true })
  eventName?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  summary?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  occurTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  locationText?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Field(() => Float, { nullable: true })
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Field(() => Float, { nullable: true })
  latitude?: number;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [ID], { nullable: true })
  tagIds?: string[];
}

@InputType('EventQueryInput')
export class EventQueryDto {
  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  province?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  city?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  district?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  startTime?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  endTime?: string;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [ID], { nullable: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Field(() => Int, { nullable: true })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @Field(() => Int, { nullable: true })
  pageSize?: number = 20;
}

@InputType('EventMapQueryInput')
export class EventMapQueryDto {
  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  industryTypeId?: string;

  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  province?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  city?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  district?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  startTime?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  endTime?: string;

  @IsOptional()
  @IsIn([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [ID], { nullable: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;
}
