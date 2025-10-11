import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventAttachmentEntity, FileType } from '@pro/entities';
import { MinIOClient } from '@pro/minio';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';
import { UpdateAttachmentSortDto } from './dto/attachment.dto';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
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
      this.logger.error('初始化 MinIO 存储桶失败', error);
    }
  }

  private calculateMD5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
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

  private getMaxFileSize(fileType: FileType): number {
    switch (fileType) {
      case FileType.IMAGE:
        return parseInt(
          this.configService.get<string>('UPLOAD_MAX_SIZE_IMAGE') || '10485760',
          10,
        );
      case FileType.VIDEO:
        return parseInt(
          this.configService.get<string>('UPLOAD_MAX_SIZE_VIDEO') || '524288000',
          10,
        );
      case FileType.DOCUMENT:
        return parseInt(
          this.configService.get<string>('UPLOAD_MAX_SIZE_DOCUMENT') || '52428800',
          10,
        );
    }
  }

  private getAllowedMimeTypes(fileType: FileType): string[] {
    const typesConfig = {
      [FileType.IMAGE]: this.configService.get<string>('UPLOAD_ALLOWED_IMAGE_TYPES') || 'image/jpeg,image/png,image/gif,image/webp',
      [FileType.VIDEO]: this.configService.get<string>('UPLOAD_ALLOWED_VIDEO_TYPES') || 'video/mp4,video/avi,video/mov',
      [FileType.DOCUMENT]: this.configService.get<string>('UPLOAD_ALLOWED_DOCUMENT_TYPES') || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return typesConfig[fileType].split(',').map(type => type.trim());
  }

  private validateFile(file: Express.Multer.File): void {
    const fileType = this.getFileType(file.mimetype);
    const maxSize = this.getMaxFileSize(fileType);
    const allowedTypes = this.getAllowedMimeTypes(fileType);

    if (file.size > maxSize) {
      const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
      this.logger.warn(`文件验证失败: 文件大小超限 - ${file.originalname} (${file.size} bytes > ${maxSize} bytes)`);
      throw new BadRequestException(`文件大小不能超过 ${sizeMB}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      this.logger.warn(`文件验证失败: 不支持的文件类型 - ${file.originalname} (${file.mimetype})`);
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const mimeTypeExtMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/mov': ['.mov'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    };

    const expectedExts = mimeTypeExtMap[file.mimetype] || [];
    if (expectedExts.length > 0 && !expectedExts.includes(ext)) {
      this.logger.warn(`文件验证失败: 文件扩展名与类型不匹配 - ${file.originalname} (ext: ${ext}, mime: ${file.mimetype})`);
      throw new BadRequestException('文件扩展名与类型不匹配');
    }
  }

  async uploadAttachment(
    eventId: string,
    file: Express.Multer.File,
  ): Promise<EventAttachmentEntity> {
    this.validateFile(file);

    const fileMd5 = this.calculateMD5(file.buffer);
    const ext = path.extname(file.originalname);

    const existingFile = await this.attachmentRepository.findOne({
      where: { fileMd5 },
    });

    const maxSortOrder = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .where('attachment.eventId = :eventId', { eventId })
      .select('MAX(attachment.sortOrder)', 'maxSort')
      .getRawOne();

    if (existingFile) {
      this.logger.log(
        `检测到重复文件 - MD5: ${fileMd5}, 复用已有文件: ${existingFile.objectName}`,
      );

      const newAttachment = this.attachmentRepository.create({
        eventId,
        fileName: file.originalname,
        fileUrl: existingFile.fileUrl,
        bucketName: existingFile.bucketName,
        objectName: existingFile.objectName,
        fileType: this.getFileType(file.mimetype),
        fileSize: file.size,
        mimeType: file.mimetype,
        fileMd5,
        sortOrder: (maxSortOrder?.maxSort || 0) + 1,
      });

      const savedAttachment = await this.attachmentRepository.save(newAttachment);

      this.logger.log(
        `文件去重成功 - eventId: ${eventId}, 文件名: ${file.originalname}, MD5: ${fileMd5}`,
      );

      return savedAttachment;
    }

    const objectName = `shared/${fileMd5.substring(0, 2)}/${fileMd5}${ext}`;

    try {
      await this.minioClient.uploadBuffer(
        this.bucketName,
        objectName,
        file.buffer,
      );

      const fileUrl = await this.minioClient.getPresignedUrl(
        this.bucketName,
        objectName,
      );

      const attachment = this.attachmentRepository.create({
        eventId,
        fileName: file.originalname,
        fileUrl,
        bucketName: this.bucketName,
        objectName,
        fileType: this.getFileType(file.mimetype),
        fileSize: file.size,
        mimeType: file.mimetype,
        fileMd5,
        sortOrder: (maxSortOrder?.maxSort || 0) + 1,
      });

      const savedAttachment = await this.attachmentRepository.save(attachment);

      this.logger.log(
        `文件上传成功 - eventId: ${eventId}, 文件名: ${file.originalname}, 大小: ${file.size} bytes, MD5: ${fileMd5}`,
      );

      return savedAttachment;
    } catch (error) {
      this.logger.error(
        `文件上传失败 - eventId: ${eventId}, 文件名: ${file.originalname}`,
        error instanceof Error ? error.stack : error,
      );
      throw new BadRequestException('文件上传失败');
    }
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
      this.logger.warn(`删除附件失败: 附件不存在 - eventId: ${eventId}, attachmentId: ${attachmentId}`);
      throw new NotFoundException('附件不存在');
    }

    await this.attachmentRepository.remove(attachment);

    const referenceCount = await this.attachmentRepository.count({
      where: { objectName: attachment.objectName },
    });

    if (referenceCount === 0) {
      try {
        await this.minioClient.deleteObject(
          attachment.bucketName,
          attachment.objectName,
        );
        this.logger.log(
          `附件删除成功，已删除 MinIO 文件 - eventId: ${eventId}, attachmentId: ${attachmentId}, objectName: ${attachment.objectName}`,
        );
      } catch (error) {
        this.logger.error(
          `删除 MinIO 文件失败 - objectName: ${attachment.objectName}`,
          error instanceof Error ? error.stack : error,
        );
      }
    } else {
      this.logger.log(
        `附件删除成功，文件仍有 ${referenceCount} 个引用，保留 MinIO 文件 - eventId: ${eventId}, attachmentId: ${attachmentId}, objectName: ${attachment.objectName}`,
      );
    }
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
