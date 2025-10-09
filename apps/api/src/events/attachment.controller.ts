import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentService } from './attachment.service';
import { UpdateAttachmentSortDto } from './dto/attachment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events/:eventId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    return this.attachmentService.uploadAttachment(eventId, file);
  }

  @Get()
  getAttachments(@Param('eventId') eventId: string) {
    return this.attachmentService.getAttachments(eventId);
  }

  @Delete(':id')
  deleteAttachment(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ) {
    return this.attachmentService.deleteAttachment(eventId, id);
  }

  @Put('sort')
  updateSort(
    @Param('eventId') eventId: string,
    @Body('attachments') attachments: UpdateAttachmentSortDto[],
  ) {
    return this.attachmentService.updateAttachmentsSort(eventId, attachments);
  }
}
