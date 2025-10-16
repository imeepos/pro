import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AttachmentService } from './attachment.service';
import {
  AttachmentUploadCredential,
  ConfirmAttachmentUploadInput,
  RequestAttachmentUploadInput,
} from './dto/attachment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EventAttachmentModel, mapEventAttachmentEntityToModel } from './models/event.model';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => EventAttachmentModel)
@UseGuards(CompositeAuthGuard)
export class AttachmentResolver {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Mutation(() => AttachmentUploadCredential, { name: 'requestEventAttachmentUpload' })
  async requestUpload(
    @Args('input', { type: () => RequestAttachmentUploadInput }) input: RequestAttachmentUploadInput,
    @CurrentUser('userId') userId: string,
  ): Promise<AttachmentUploadCredential> {
    return this.attachmentService.createUploadIntent({
      eventId: input.eventId,
      userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      fileMd5: input.fileMd5,
    });
  }

  @Mutation(() => EventAttachmentModel, { name: 'confirmEventAttachmentUpload' })
  async confirmUpload(
    @Args('input', { type: () => ConfirmAttachmentUploadInput }) input: ConfirmAttachmentUploadInput,
    @CurrentUser('userId') userId: string,
  ): Promise<EventAttachmentModel> {
    const attachment = await this.attachmentService.confirmUploadIntent(input.token, userId);
    return mapEventAttachmentEntityToModel(attachment);
  }
}
