import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class WorkflowFilterInput {
  @Field(() => String, { nullable: true })
  search?: string | null;

  @Field(() => String, { nullable: true })
  tag?: string | null;
}
