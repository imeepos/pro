import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugAttachment } from '@pro/types';
import { BugAttachmentEntity, BugEntity, UserEntity } from '@pro/entities';

@Injectable()
export class BugAttachmentService {
  private readonly logger = new Logger(BugAttachmentService.name);

  constructor(
    @InjectRepository(BugAttachmentEntity)
    private readonly attachmentRepository: Repository<BugAttachmentEntity>,
    @InjectRepository(BugEntity)
    private readonly bugRepository: Repository<BugEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(bugId: string, file: Express.Multer.File): Promise<BugAttachment> {
    this.logger.log(`为Bug ${bugId} 上传附件: ${file.originalname}`);

    const bug = await this.bugRepository.findOne({ where: { id: bugId } });
    if (!bug) {
      throw new NotFoundException('Bug不存在');
    }

    const attachmentEntity = this.attachmentRepository.create({
      bugId,
      filename: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      uploadedBy: 'system',
    });

    const savedAttachment = await this.attachmentRepository.save(attachmentEntity);
    return this.mapEntityToDto(savedAttachment);
  }

  async findByBugId(bugId: string): Promise<BugAttachment[]> {
    this.logger.log(`获取Bug ${bugId} 的附件列表`);

    const attachments = await this.attachmentRepository.find({
      where: { bugId },
      order: { uploadedAt: 'DESC' },
      relations: ['uploader'],
    });

    return attachments.map(attachment => this.mapEntityToDto(attachment));
  }

  async remove(attachmentId: string): Promise<void> {
    this.logger.log(`删除附件: ${attachmentId}`);

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId }
    });

    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }

    await this.attachmentRepository.remove(attachment);
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