import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class BugAttachmentModel {
  @Field(() => ID)
  id: string;

  @Field()
  bugId: string;

  @Field()
  filename: string;

  @Field()
  url: string;

  @Field()
  size: number;

  @Field()
  mimeType: string;

  @Field({ nullable: true })
  uploadedBy?: string;

  @Field()
  createdAt: Date;
}
