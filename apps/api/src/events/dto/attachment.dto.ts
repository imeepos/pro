import { IsString, IsOptional, IsInt, IsIn, Min, IsNumber, IsPositive, Matches } from 'class-validator';
import { FileType } from '@pro/types';
import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';

export class UploadAttachmentDto {
  @IsString()
  eventId: string;
}

export class UpdateAttachmentSortDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class AttachmentQueryDto {
  @IsOptional()
  @IsIn([FileType.IMAGE, FileType.VIDEO, FileType.DOCUMENT])
  fileType?: FileType;
}

@InputType()
export class RequestAttachmentUploadInput {
  @IsString()
  @Field(() => ID)
  eventId: string;

  @IsString()
  @Field(() => String)
  fileName: string;

  @IsString()
  @Field(() => String)
  mimeType: string;

  @IsNumber()
  @IsPositive()
  @Field(() => Float)
  fileSize: number;

  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, { message: 'fileMd5 必须为32位十六进制字符串' })
  @Field(() => String)
  fileMd5: string;
}

@ObjectType()
export class AttachmentUploadCredential {
  @Field(() => String)
  token: string;

  @Field(() => String, { nullable: true })
  uploadUrl?: string;

  @Field(() => String)
  objectKey: string;

  @Field(() => String)
  bucketName: string;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => Boolean)
  requiresUpload: boolean;
}

@InputType()
export class ConfirmAttachmentUploadInput {
  @IsString()
  @Field(() => String)
  token: string;
}
