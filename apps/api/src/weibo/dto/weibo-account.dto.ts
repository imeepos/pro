import { Field, ID, InputType } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('WeiboAccountFilterInput')
export class WeiboAccountFilterDto {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Number, { nullable: true })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Number, { nullable: true })
  pageSize?: number = 10;
}

@InputType('WeiboAccountIdInput')
export class WeiboAccountIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => ID)
  id: number;
}
