import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

@InputType('RetryMessagesInput')
export class RetryMessagesInput {
  @Field(() => String, { description: '目标死信队列名称' })
  @IsString()
  @IsNotEmpty()
  queueName!: string;

  @Field(() => [String], { description: '需重试的消息 ID 列表' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  messageIds!: string[];
}
