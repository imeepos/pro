import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class BugAttachmentModel {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field()
  originalName: string;

  @Field()
  mimeType: string;

  @Field()
  size: number;

  @Field()
  url: string;

  @Field()
  uploadedBy: string;

  @Field()
  uploadedAt: Date;
}
