import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventAttachmentEntity, FileType } from '../entities/event-attachment.entity';
import { MinIOClient } from '@pro/minio';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UpdateAttachmentSortDto } from './dto/attachment.dto';

@Injectable()
export class AttachmentService {
  private minioClient: MinIOClient;
  private bucketName: string;

  constructor(
    @InjectRepository(EventAttachmentEntity)
    private readonly attachmentRepository: Repository<EventAttachmentEntity>,
    private readonly configService: ConfigService,
  ) {
    const minioPort = this.configService.get<string>('MINIO_API_PORT') || '9000';

    this.minioClient = new MinIOClient({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'minio',
      port: parseInt(minioPort, 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ROOT_USER') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD') || 'ChangeMe123!',
    });

    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'app-bucket';
    this.initBucket();
  }

  private async initBucket() {
    try {
      await this.minioClient.makeBucket(this.bucketName);
    } catch (error) {
      console.error('Failed to initialize MinIO bucket:', error);
    }
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else {
      return FileType.DOCUMENT;
    }
  }

  async uploadAttachment(
    eventId: string,
    file: Express.Multer.File,
  ): Promise<EventAttachmentEntity> {
    const ext = path.extname(file.originalname);
    const objectName = `${eventId}/${uuidv4()}${ext}`;

    await this.minioClient.uploadBuffer(
      this.bucketName,
      objectName,
      file.buffer,
    );

    const fileUrl = await this.minioClient.getPresignedUrl(
      this.bucketName,
      objectName,
    );

    const maxSortOrder = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .where('attachment.eventId = :eventId', { eventId })
      .select('MAX(attachment.sortOrder)', 'maxSort')
      .getRawOne();

    const attachment = this.attachmentRepository.create({
      eventId,
      fileName: file.originalname,
      fileUrl,
      bucketName: this.bucketName,
      objectName,
      fileType: this.getFileType(file.mimetype),
      fileSize: file.size,
      mimeType: file.mimetype,
      sortOrder: (maxSortOrder?.maxSort || 0) + 1,
    });

    return this.attachmentRepository.save(attachment);
  }

  async getAttachments(eventId: string): Promise<EventAttachmentEntity[]> {
    return this.attachmentRepository.find({
      where: { eventId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async deleteAttachment(eventId: string, attachmentId: string): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, eventId },
    });

    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }

    try {
      await this.minioClient.deleteObject(
        attachment.bucketName,
        attachment.objectName,
      );
    } catch (error) {
      console.error('Failed to delete file from MinIO:', error);
    }

    await this.attachmentRepository.remove(attachment);
  }

  async updateAttachmentsSort(
    eventId: string,
    sortData: UpdateAttachmentSortDto[],
  ): Promise<void> {
    for (const item of sortData) {
      await this.attachmentRepository.update(
        { id: item.id, eventId },
        { sortOrder: item.sortOrder },
      );
    }
  }
}
