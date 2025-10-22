import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WeiboInteractionType, WeiboTargetType } from '@pro/entities';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, {
  name: 'SortOrder',
});

@InputType('PostFilterInput')
export class PostFilterDto {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  authorNickname?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateTo?: Date;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isLongText?: boolean;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isRepost?: boolean;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  favorited?: boolean;
}

@InputType('CommentFilterInput')
export class CommentFilterDto {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  authorNickname?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  postId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateTo?: Date;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  hasLikes?: boolean;
}

@InputType('InteractionFilterInput')
export class InteractionFilterDto {
  @IsOptional()
  @IsEnum(WeiboInteractionType)
  @Field(() => WeiboInteractionType, { nullable: true })
  interactionType?: WeiboInteractionType;

  @IsOptional()
  @IsEnum(WeiboTargetType)
  @Field(() => WeiboTargetType, { nullable: true })
  targetType?: WeiboTargetType;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  userWeiboId?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  targetWeiboId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  dateTo?: Date;
}

@InputType('PaginationInput')
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number = 20;
}

@InputType('SortInput')
export class SortDto {
  @IsString()
  @Field(() => String)
  field: string;

  @IsEnum(SortOrder)
  @Field(() => SortOrder)
  order: SortOrder;
}
