import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugEntity, BugCommentEntity, BugAttachmentEntity, UserEntity } from '@pro/entities';
import { BugResolver } from './bug.resolver';
import { BugService } from './bug.service';
import { BugCommentService } from './bug-comment.service';
import { BugAttachmentService } from './bug-attachment.service';
import { BugNotificationService } from './bug-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BugEntity,
      BugCommentEntity,
      BugAttachmentEntity,
      UserEntity,
    ]),
  ],
  providers: [
    BugResolver,
    BugService,
    BugCommentService,
    BugAttachmentService,
    BugNotificationService,
  ],
  exports: [
    BugService,
    BugCommentService,
    BugAttachmentService,
    BugNotificationService,
  ],
})
export class BugModule {}