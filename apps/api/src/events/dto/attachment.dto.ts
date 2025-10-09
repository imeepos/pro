import { IsString, IsOptional, IsInt, IsIn, Min } from 'class-validator';
import { FileType } from '../../entities/event-attachment.entity';

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
