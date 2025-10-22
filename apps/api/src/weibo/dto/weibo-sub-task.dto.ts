import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Field, InputType, Int } from '@nestjs/graphql';

@InputType('WeiboSubTaskFilterInput')
export class QueryWeiboSubTaskDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  taskId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'taskId', 'type', 'status'])
  @Field(() => String, { nullable: true })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  @Field(() => String, { nullable: true })
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}