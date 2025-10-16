import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType('NotificationInput')
export class NotificationInput {
  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  id?: string;

  @IsString()
  @MaxLength(100)
  @Field(() => String)
  title: string;

  @IsString()
  @MaxLength(500)
  @Field(() => String)
  message: string;

  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  userId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @Field(() => GraphQLISODateTime, { nullable: true })
  timestamp?: Date;
}
