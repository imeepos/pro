import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

@InputType('JdAccountFilterInput')
export class JdAccountFilterInput {
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
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  pageSize?: number = 10;
}
