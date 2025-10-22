import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DlqQueueInfo')
export class DlqQueueInfoModel {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  messageCount: number;

  @Field(() => String)
  originalQueue: string;
}
