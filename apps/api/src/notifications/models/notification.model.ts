import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Notification')
export class NotificationModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  message: string;

  @Field(() => GraphQLISODateTime)
  timestamp: Date;

  @Field(() => ID, { nullable: true })
  userId?: string;
}
