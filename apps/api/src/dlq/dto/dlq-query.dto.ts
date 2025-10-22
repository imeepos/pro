import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType('DlqQueryInput')
export class DlqQueryInput {
  @Field(() => String, { description: '死信队列名称' })
  @IsString()
  @IsNotEmpty()
  queueName!: string;

  @Field(() => Int, { defaultValue: 1, description: '页码，起始为 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, {
    defaultValue: 20,
    description: '每页条数，最大 100 条',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
