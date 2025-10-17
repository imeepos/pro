import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
class BugStatusStatistics {
  @Field(() => Int)
  open: number;

  @Field(() => Int, { name: 'in_progress' })
  inProgress: number;

  @Field(() => Int)
  resolved: number;

  @Field(() => Int)
  closed: number;

  @Field(() => Int)
  rejected: number;

  @Field(() => Int)
  reopened: number;
}

@ObjectType()
class BugPriorityStatistics {
  @Field(() => Int)
  low: number;

  @Field(() => Int)
  medium: number;

  @Field(() => Int)
  high: number;

  @Field(() => Int)
  critical: number;
}

@ObjectType()
class BugCategoryStatistics {
  @Field(() => Int)
  functional: number;

  @Field(() => Int)
  performance: number;

  @Field(() => Int)
  security: number;

  @Field(() => Int, { name: 'ui_ux' })
  uiUx: number;

  @Field(() => Int)
  integration: number;

  @Field(() => Int)
  data: number;

  @Field(() => Int)
  configuration: number;

  @Field(() => Int)
  documentation: number;
}

@ObjectType()
export class BugStatisticsModel {
  @Field(() => Int)
  total: number;

  @Field(() => BugStatusStatistics)
  byStatus: BugStatusStatistics;

  @Field(() => BugPriorityStatistics)
  byPriority: BugPriorityStatistics;

  @Field(() => BugCategoryStatistics)
  byCategory: BugCategoryStatistics;
}