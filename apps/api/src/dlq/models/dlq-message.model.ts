import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('DlqMessage')
export class DlqMessageModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  queueName: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: unknown;

  @Field(() => GraphQLISODateTime)
  failedAt: Date | string;

  @Field(() => Int)
  retryCount: number;

  @Field(() => String, { nullable: true })
  errorMessage?: string;
}
