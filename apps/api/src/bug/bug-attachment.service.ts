import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { BugAttachment } from '@pro/types';
import { BugAttachmentEntity, BugEntity, UserEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class BugAttachmentService {
  private readonly logger = new Logger(BugAttachmentService.name);

  async create(bugId: string, file: Express.Multer.File): Promise<BugAttachment> {
    this.logger.log(`为Bug ${bugId} 上传附件: ${file.originalname}`);

    return useEntityManager(async (manager) => {
      const bug = await manager.getRepository(BugEntity).findOne({ where: { id: bugId } });
      if (!bug) {
        throw new NotFoundException('Bug不存在');
      }

      const attachmentEntity = manager.getRepository(BugAttachmentEntity).create({
        bugId,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      });

      const savedAttachment = await manager.getRepository(BugAttachmentEntity).save(attachmentEntity);
      return this.mapEntityToDto(savedAttachment);
    });
  }

  async findByBugId(bugId: string): Promise<BugAttachment[]> {
    this.logger.log(`获取Bug ${bugId} 的附件列表`);

    return useEntityManager(async (manager) => {
      const attachments = await manager.getRepository(BugAttachmentEntity).find({
        where: { bugId },
        order: { uploadedAt: 'DESC' },
        relations: ['uploader'],
      });

      return attachments.map(attachment => this.mapEntityToDto(attachment));
    });
  }

  async remove(attachmentId: string): Promise<void> {
    this.logger.log(`删除附件: ${attachmentId}`);

    return useEntityManager(async (manager) => {
      const attachment = await manager.getRepository(BugAttachmentEntity).findOne({
        where: { id: attachmentId }
      });

      if (!attachment) {
        throw new NotFoundException('附件不存在');
      }

      await manager.getRepository(BugAttachmentEntity).remove(attachment);
    });
  }

  private mapEntityToDto(entity: BugAttachmentEntity): BugAttachment {
    return {
      id: entity.id,
      filename: entity.filename,
      originalName: entity.originalName,
      mimeType: entity.mimeType,
      size: entity.size,
      url: entity.url,
      uploadedBy: entity.uploadedBy,
      uploadedAt: entity.uploadedAt,
    };
  }
}