import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
class BugStatusStatistics {
  @Field(() => Int)
  open: number;

  @Field(() => Int)
  inProgress: number;

  @Field(() => Int)
  resolved: number;

  @Field(() => Int)
  closed: number;
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
export class BugStatisticsModel {
  @Field(() => Int)
  total: number;

  @Field(() => BugStatusStatistics)
  byStatus: BugStatusStatistics;

  @Field(() => BugPriorityStatistics)
  byPriority: BugPriorityStatistics;
}