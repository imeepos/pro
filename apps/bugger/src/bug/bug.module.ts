import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { BugEntity, BugCommentEntity, BugAttachmentEntity, UserEntity } from '@pro/entities';
import { BugController } from './bug.controller';
import { BugService } from './bug.service';
import { BugCommentService } from './bug-comment.service';
import { BugAttachmentService } from './bug-attachment.service';
import { BugNotificationService } from './bug-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BugEntity, BugCommentEntity, BugAttachmentEntity, UserEntity]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.log'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型'), false);
        }
      },
    }),
    ConfigModule,
  ],
  controllers: [BugController],
  providers: [
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