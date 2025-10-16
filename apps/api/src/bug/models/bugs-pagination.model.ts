import { Field, ObjectType, Int } from '@nestjs/graphql';
import { BugModel } from './bug.model';

@ObjectType()
export class BugsPaginationModel {
  @Field(() => [BugModel])
  bugs: BugModel[];

  @Field(() => Int)
  total: number;
}