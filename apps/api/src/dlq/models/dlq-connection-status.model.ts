import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DlqConnectionStatusModel {
  @Field()
  target!: string;

  @Field()
  state!: string;

  @Field()
  connected!: boolean;

  @Field({ nullable: true })
  lastConnectedAt?: Date;

  @Field({ nullable: true })
  lastErrorMessage?: string;

  @Field({ nullable: true })
  lastErrorAt?: Date;
}
