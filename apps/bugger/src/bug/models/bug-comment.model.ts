import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class BugCommentModel {
  @Field(() => ID)
  id: string;

  @Field()
  bugId: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  authorId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
