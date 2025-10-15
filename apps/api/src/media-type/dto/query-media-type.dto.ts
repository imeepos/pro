import { IsOptional, IsInt, IsEnum, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Field, InputType, Int } from '@nestjs/graphql';
import { MediaTypeStatus } from '@pro/entities';

@InputType('MediaTypeFilterInput')
export class QueryMediaTypeDto {
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
  @Max(100)
  @Field(() => Int, { nullable: true })
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(MediaTypeStatus)
  @Field(() => MediaTypeStatus, { nullable: true })
  status?: MediaTypeStatus;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;
}
