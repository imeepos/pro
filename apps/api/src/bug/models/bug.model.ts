import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { BugStatus, BugPriority } from '@pro/types';

registerEnumType(BugStatus, { name: 'BugStatus' });
registerEnumType(BugPriority, { name: 'BugPriority' });

@ObjectType()
export class BugModel {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => BugStatus)
  status: BugStatus;

  @Field(() => BugPriority)
  priority: BugPriority;

  @Field({ nullable: true })
  category?: string;

  @Field()
  reporterId: string;

  @Field({ nullable: true })
  assigneeId?: string;

  @Field({ nullable: true })
  stepsToReproduce?: string;

  @Field({ nullable: true })
  expectedBehavior?: string;

  @Field({ nullable: true })
  actualBehavior?: string;

  @Field({ nullable: true })
  reproductionRate?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field({ nullable: true })
  resolvedBy?: string;

  @Field({ nullable: true })
  closedAt?: Date;

  @Field({ nullable: true })
  closedBy?: string;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  estimatedHours?: number;

  @Field({ nullable: true })
  actualHours?: number;
}