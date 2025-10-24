import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { WorkflowExecutionStatus } from '@pro/types';
import { PageInfoModel } from '../../common/models/pagination.model';

@ObjectType('WorkflowExecutionMetrics')
export class WorkflowExecutionMetricsModel {
  @Field(() => Int)
  totalNodes!: number;

  @Field(() => Int)
  succeededNodes!: number;

  @Field(() => Int)
  failedNodes!: number;

  @Field(() => Float, { nullable: true })
  throughput?: number | null;

  @Field(() => Int, { nullable: true })
  payloadSize?: number | null;
}

@ObjectType('WorkflowExecution')
export class WorkflowExecutionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  workflowId!: string;

  @Field(() => Int)
  revision!: number;

  @Field(() => String)
  status!: WorkflowExecutionStatus;

  @Field(() => Date)
  startedAt!: Date;

  @Field(() => Date, { nullable: true })
  finishedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;

  @Field(() => String)
  triggeredBy!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: Record<string, unknown> | null;

  @Field(() => WorkflowExecutionMetricsModel, { nullable: true })
  metrics?: WorkflowExecutionMetricsModel | null;

  @Field(() => String, { nullable: true })
  logsPointer?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType('WorkflowExecutionEdge')
export class WorkflowExecutionEdgeModel {
  @Field(() => String)
  cursor!: string;

  @Field(() => WorkflowExecutionModel)
  node!: WorkflowExecutionModel;
}

@ObjectType('WorkflowExecutionConnection')
export class WorkflowExecutionConnectionModel {
  @Field(() => [WorkflowExecutionEdgeModel])
  edges!: WorkflowExecutionEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo!: PageInfoModel;

  @Field(() => Int)
  totalCount!: number;
}
