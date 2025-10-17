import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { BugStatus, BugPriority } from '@pro/types';

@InputType()
export class CreateBugInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => BugPriority, { nullable: true })
  @IsOptional()
  @IsEnum(BugPriority)
  priority?: BugPriority;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  stepsToReproduce?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  expectedBehavior?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  actualBehavior?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reproductionRate?: string;

  @Field({ nullable: true })
  @IsOptional()
  dueDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @Field()
  @IsString()
  reporterId: string;
}

@InputType()
export class UpdateBugInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => BugStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BugStatus)
  status?: BugStatus;

  @Field(() => BugPriority, { nullable: true })
  @IsOptional()
  @IsEnum(BugPriority)
  priority?: BugPriority;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  stepsToReproduce?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  expectedBehavior?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  actualBehavior?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reproductionRate?: string;

  @Field({ nullable: true })
  @IsOptional()
  dueDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  actualHours?: number;
}

@InputType()
export class BugFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  page?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @Field(() => [BugStatus], { nullable: true })
  @IsOptional()
  status?: BugStatus[];

  @Field(() => [BugPriority], { nullable: true })
  @IsOptional()
  priority?: BugPriority[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reporterId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}

@InputType()
export class CreateBugCommentInput {
  @Field()
  @IsString()
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  authorId?: string;
}

@InputType()
export class UpdateBugStatusInput {
  @Field(() => BugStatus)
  @IsEnum(BugStatus)
  status: BugStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;
}

@InputType()
export class AssignBugInput {
  @Field()
  @IsString()
  assigneeId: string;
}