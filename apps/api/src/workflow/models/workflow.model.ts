import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { WorkflowNodeKind } from '@pro/types';

@ObjectType('WorkflowCanvasPoint')
export class WorkflowCanvasPointModel {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@ObjectType('WorkflowNodeConfig')
export class WorkflowNodeConfigModel {
  @Field(() => GraphQLJSON)
  schema!: Record<string, unknown>;

  @Field(() => GraphQLJSON)
  values!: Record<string, unknown>;
}

@ObjectType('WorkflowNode')
export class WorkflowNodeModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  kind!: WorkflowNodeKind;

  @Field(() => WorkflowNodeConfigModel)
  config!: WorkflowNodeConfigModel;

  @Field(() => WorkflowCanvasPointModel, { nullable: true })
  position?: WorkflowCanvasPointModel | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

@ObjectType('WorkflowEdge')
export class WorkflowEdgeModel {
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

  @Field(() => GraphQLJSON, { nullable: true })
  condition?: Record<string, unknown> | null;
}

@ObjectType('WorkflowDefinition')
export class WorkflowDefinitionModel {
  @Field(() => Int)
  version!: number;

  @Field(() => [WorkflowNodeModel])
  nodes!: WorkflowNodeModel[];

  @Field(() => [WorkflowEdgeModel])
  edges!: WorkflowEdgeModel[];
}

@ObjectType('Workflow')
export class WorkflowModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => WorkflowDefinitionModel)
  definition!: WorkflowDefinitionModel;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String, { nullable: true })
  createdBy?: string | null;

  @Field(() => String, { nullable: true })
  updatedBy?: string | null;
}
