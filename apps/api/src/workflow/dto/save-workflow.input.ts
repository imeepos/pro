import { Field, ID, InputType, Int, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { WorkflowNodeKind } from '@pro/types';

@InputType()
export class WorkflowCanvasPointInput {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@InputType()
export class WorkflowNodeConfigInput {
  @Field(() => GraphQLJSONObject)
  schema!: Record<string, unknown>;

  @Field(() => GraphQLJSONObject)
  values!: Record<string, unknown>;
}

@InputType()
export class WorkflowNodeInput {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  kind!: WorkflowNodeKind;

  @Field(() => WorkflowNodeConfigInput)
  config!: WorkflowNodeConfigInput;

  @Field(() => WorkflowCanvasPointInput, { nullable: true })
  position?: WorkflowCanvasPointInput | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

@InputType()
export class WorkflowEdgeInput {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sourceId!: string;

  @Field(() => ID)
  targetId!: string;

  @Field(() => String, { nullable: true })
  sourcePort?: string | null;

  @Field(() => String, { nullable: true })
  targetPort?: string | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  condition?: Record<string, unknown> | null;
}

@InputType()
export class WorkflowDefinitionInput {
  @Field(() => Int)
  version!: number;

  @Field(() => [WorkflowNodeInput])
  nodes!: WorkflowNodeInput[];

  @Field(() => [WorkflowEdgeInput])
  edges!: WorkflowEdgeInput[];
}

@InputType()
export class SaveWorkflowInput {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [String], { nullable: true })
  tags?: string[] | null;

  @Field(() => WorkflowDefinitionInput)
  definition!: WorkflowDefinitionInput;
}
