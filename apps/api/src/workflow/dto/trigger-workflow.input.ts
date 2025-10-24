import { Field, ID, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class TriggerWorkflowInput {
  @Field(() => ID)
  workflowId!: string;

  @Field(() => Int, { nullable: true })
  revision?: number | null;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: Record<string, unknown> | null;
}
