import { Field, ID, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class TriggerWorkflowInput {
  @Field(() => ID)
  workflowId!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: Record<string, unknown> | null;
}
