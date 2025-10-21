import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Field, InputType, Int } from '@nestjs/graphql';

@InputType('CreateWeiboSearchTaskInput')
export class CreateWeiboSearchTaskDto {
  @IsString()
  @MaxLength(100)
  @Field(() => String)
  keyword: string;

  @IsDateString()
  @Field(() => String)
  startDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/)
  @MaxLength(20)
  @Field(() => String, { nullable: true })
  crawlInterval?: string;
}

@InputType('UpdateWeiboSearchTaskInput')
export class UpdateWeiboSearchTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+[smhd]$/)
  @MaxLength(20)
  @Field(() => String, { nullable: true })
  crawlInterval?: string;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;
}

@InputType('PauseWeiboTaskInput')
export class PauseTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  reason?: string;
}

@InputType('ResumeWeiboTaskInput')
export class ResumeTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  reason?: string;
}

@InputType('RunWeiboTaskNowInput')
export class RunNowTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  reason?: string;
}

@InputType('WeiboSearchTaskFilterInput')
export class QueryTaskDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'startDate', 'nextRunAt'])
  @Field(() => String, { nullable: true })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  @Field(() => String, { nullable: true })
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}
