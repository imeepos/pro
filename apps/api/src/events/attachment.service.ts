import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  EventAttachmentEntity,
  EventEntity,
  useEntityManager,
  useTranslation
} from '@pro/entities';
import { FileType } from '@pro/types';
import { MinIOClient } from '@pro/minio';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';
import { UpdateAttachmentSortDto } from './dto/attachment.dto';
import { AttachmentUploadTokenEntity } from './entities/attachment-upload-token.entity';

export interface AttachmentUploadIntentResult {
  token: string;
  uploadUrl?: string;
  objectKey: string;
  bucketName: string;
  expiresAt: Date;
  requiresUpload: boolean;
}

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly uploadUrlExpirySeconds = 10 * 60;
  private minioClient: MinIOClient;
  private bucketName: string;

  constructor(
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

  private resolveFileType(mimeType: string): FileType {
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

  private validateFileMetadata(fileName: string, mimeType: string, size: number): FileType {
    const fileType = this.resolveFileType(mimeType);
    const maxSize = this.getMaxFileSize(fileType);
    const allowedTypes = this.getAllowedMimeTypes(fileType);

    if (size > maxSize) {
      const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
      this.logger.warn(`文件验证失败: 文件大小超限 - ${fileName} (${size} bytes > ${maxSize} bytes)`);
      throw new BadRequestException(`文件大小不能超过 ${sizeMB}MB`);
    }

    if (!allowedTypes.includes(mimeType)) {
      this.logger.warn(`文件验证失败: 不支持的文件类型 - ${fileName} (${mimeType})`);
      throw new BadRequestException(`不支持的文件类型: ${mimeType}`);
    }

    const ext = path.extname(fileName).toLowerCase();
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

    const expectedExts = mimeTypeExtMap[mimeType] || [];
    if (expectedExts.length > 0 && !expectedExts.includes(ext)) {
      this.logger.warn(`文件验证失败: 文件扩展名与类型不匹配 - ${fileName} (ext: ${ext}, mime: ${mimeType})`);
      throw new BadRequestException('文件扩展名与类型不匹配');
    }

    return fileType;
  }

  private buildObjectName(fileMd5: string, fileName: string): string {
    const ext = path.extname(fileName) || '';
    return `shared/${fileMd5.substring(0, 2)}/${fileMd5}${ext}`;
  }

  private async generatePresignedPutUrl(
    bucketName: string,
    objectName: string,
  ): Promise<string> {
    const client = this.minioClient as unknown as {
      getPresignedPutUrl?: (bucket: string, object: string, expiry?: number) => Promise<string>;
      client?: {
        presignedPutObject?: (bucket: string, object: string, expiry: number) => Promise<string>;
      };
    };

    if (client.getPresignedPutUrl) {
      return client.getPresignedPutUrl(bucketName, objectName, this.uploadUrlExpirySeconds);
    }

    if (client.client?.presignedPutObject) {
      return client.client.presignedPutObject(bucketName, objectName, this.uploadUrlExpirySeconds);
    }

    throw new BadRequestException('暂不支持预签名上传，请联系管理员');
  }

  private async statObject(bucketName: string, objectName: string) {
    const client = this.minioClient as unknown as {
      statObject?: (bucket: string, object: string) => Promise<{ size: number }>;
      client?: {
        statObject?: (bucket: string, object: string) => Promise<{ size: number }>;
      };
    };

    if (client.statObject) {
      return client.statObject(bucketName, objectName);
    }

    if (client.client?.statObject) {
      return client.client.statObject(bucketName, objectName);
    }

    throw new BadRequestException('无法校验上传对象状态');
  }

  private validateFile(file: Express.Multer.File): void {
    this.validateFileMetadata(file.originalname, file.mimetype, file.size);
  }

  async createUploadIntent(params: {
    eventId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileMd5: string;
  }): Promise<AttachmentUploadIntentResult> {
    return useEntityManager(async (manager) => {
      const { eventId, userId, fileName, mimeType, fileSize, fileMd5 } = params;

      const event = await manager.getRepository(EventEntity).findOne({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundException(`事件 ID ${eventId} 不存在`);
      }

      if (event.createdBy && event.createdBy !== userId) {
        throw new ForbiddenException('没有权限上传该事件的附件');
      }

      const fileType = this.validateFileMetadata(fileName, mimeType, fileSize);

      const existingAttachment = await manager.getRepository(EventAttachmentEntity).findOne({ where: { fileMd5 } });
      const objectName = existingAttachment
        ? existingAttachment.objectName
        : this.buildObjectName(fileMd5, fileName);
      const bucketName = existingAttachment?.bucketName ?? this.bucketName;
      const requiresUpload = !existingAttachment;

      const expiresAt = new Date(Date.now() + this.uploadUrlExpirySeconds * 1000);

      const token = manager.getRepository(AttachmentUploadTokenEntity).create({
        eventId,
        userId,
        fileName,
        mimeType,
        fileSize,
        fileMd5,
        objectName,
        bucketName,
        requiresUpload,
        expiresAt,
      });

      const savedToken = await manager.getRepository(AttachmentUploadTokenEntity).save(token);

      let uploadUrl: string | undefined;
      if (requiresUpload) {
        uploadUrl = await this.generatePresignedPutUrl(bucketName, objectName);
      }

      this.logger.log(
        `创建附件上传凭证: eventId=${eventId}, userId=${userId}, requiresUpload=${requiresUpload}, token=${savedToken.id}`,
      );

      return {
        token: savedToken.id,
        uploadUrl,
        objectKey: objectName,
        bucketName,
        expiresAt,
        requiresUpload,
      } satisfies AttachmentUploadIntentResult;
    });
  }

  async confirmUploadIntent(tokenId: string, userId: string): Promise<EventAttachmentEntity> {
    return useTranslation(async (transaction) => {
      const token = await transaction.getRepository(AttachmentUploadTokenEntity).findOne({ where: { id: tokenId } });

      if (!token) {
        throw new NotFoundException('上传凭证不存在或已失效');
      }

      if (token.userId !== userId) {
        throw new ForbiddenException('无权确认该上传请求');
      }

      if (token.usedAt) {
        throw new BadRequestException('上传凭证已被使用');
      }

      if (token.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('上传凭证已过期，请重新获取');
      }

      const event = await transaction.getRepository(EventEntity).findOne({ where: { id: token.eventId } });
      if (!event) {
        throw new NotFoundException(`事件 ID ${token.eventId} 不存在`);
      }

      let targetAttachment = await transaction.getRepository(EventAttachmentEntity).findOne({ where: { fileMd5: token.fileMd5 } });

      if (token.requiresUpload) {
        try {
          const stat = await this.statObject(token.bucketName, token.objectName);
          if (Number(stat.size) !== Number(token.fileSize)) {
            throw new BadRequestException('上传文件大小与声明不一致，请重新上传');
          }
        } catch (error) {
          this.logger.error('确认上传时获取对象信息失败', error);
          throw new BadRequestException('未检测到已上传的文件，请重试');
        }

        // 再次尝试查找是否已有相同 MD5 记录（可能在凭证创建后写入）
        targetAttachment = await transaction.getRepository(EventAttachmentEntity).findOne({ where: { fileMd5: token.fileMd5 } });
      }

      const reuseExisting = Boolean(targetAttachment);
      const objectName = targetAttachment?.objectName ?? token.objectName;
      const bucketName = targetAttachment?.bucketName ?? token.bucketName;
      const fileUrl = targetAttachment?.fileUrl ?? (await this.minioClient.getPresignedUrl(bucketName, objectName));

      const maxSortOrder = await transaction.getRepository(EventAttachmentEntity)
        .createQueryBuilder('attachment')
        .where('attachment.eventId = :eventId', { eventId: token.eventId })
        .select('MAX(attachment.sortOrder)', 'maxSort')
        .getRawOne();

      const attachment = transaction.getRepository(EventAttachmentEntity).create({
        eventId: token.eventId,
        fileName: token.fileName,
        fileUrl,
        bucketName,
        objectName,
        fileType: this.resolveFileType(token.mimeType),
        fileSize: Number(token.fileSize),
        mimeType: token.mimeType,
        fileMd5: token.fileMd5,
        sortOrder: (maxSortOrder?.maxSort || 0) + 1,
      });

      const savedAttachment = await transaction.getRepository(EventAttachmentEntity).save(attachment);

      token.usedAt = new Date();
      await transaction.getRepository(AttachmentUploadTokenEntity).save(token);

      this.logger.log(
        `确认附件上传成功: eventId=${token.eventId}, attachmentId=${savedAttachment.id}, reused=${reuseExisting}`,
      );

      return savedAttachment;
    });
  }

  async uploadAttachment(
    eventId: string,
    file: Express.Multer.File,
  ): Promise<EventAttachmentEntity> {
    return useEntityManager(async (manager) => {
      this.validateFile(file);

      const fileMd5 = this.calculateMD5(file.buffer);
      const ext = path.extname(file.originalname);

      const existingFile = await manager.getRepository(EventAttachmentEntity).findOne({
        where: { fileMd5 },
      });

      const maxSortOrder = await manager.getRepository(EventAttachmentEntity)
        .createQueryBuilder('attachment')
        .where('attachment.eventId = :eventId', { eventId })
        .select('MAX(attachment.sortOrder)', 'maxSort')
        .getRawOne();

      if (existingFile) {
        this.logger.log(
          `检测到重复文件 - MD5: ${fileMd5}, 复用已有文件: ${existingFile.objectName}`,
        );

        const newAttachment = manager.getRepository(EventAttachmentEntity).create({
          eventId,
          fileName: file.originalname,
          fileUrl: existingFile.fileUrl,
          bucketName: existingFile.bucketName,
          objectName: existingFile.objectName,
          fileType: this.resolveFileType(file.mimetype),
          fileSize: file.size,
          mimeType: file.mimetype,
          fileMd5,
          sortOrder: (maxSortOrder?.maxSort || 0) + 1,
        });

        const savedAttachment = await manager.getRepository(EventAttachmentEntity).save(newAttachment);

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

        const attachment = manager.getRepository(EventAttachmentEntity).create({
          eventId,
          fileName: file.originalname,
          fileUrl,
          bucketName: this.bucketName,
          objectName,
          fileType: this.resolveFileType(file.mimetype),
          fileSize: file.size,
          mimeType: file.mimetype,
          fileMd5,
          sortOrder: (maxSortOrder?.maxSort || 0) + 1,
        });

        const savedAttachment = await manager.getRepository(EventAttachmentEntity).save(attachment);

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
    });
  }

  async getAttachments(eventId: string): Promise<EventAttachmentEntity[]> {
    return useEntityManager(async (manager) => {
      return manager.getRepository(EventAttachmentEntity).find({
        where: { eventId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });
  }

  async deleteAttachment(eventId: string, attachmentId: string): Promise<void> {
    return useEntityManager(async (manager) => {
      const attachment = await manager.getRepository(EventAttachmentEntity).findOne({
        where: { id: attachmentId, eventId },
      });

      if (!attachment) {
        this.logger.warn(`删除附件失败: 附件不存在 - eventId: ${eventId}, attachmentId: ${attachmentId}`);
        throw new NotFoundException('附件不存在');
      }

      await manager.getRepository(EventAttachmentEntity).remove(attachment);

      const referenceCount = await manager.getRepository(EventAttachmentEntity).count({
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
    });
  }

  async updateAttachmentsSort(
    eventId: string,
    sortData: UpdateAttachmentSortDto[],
  ): Promise<void> {
    return useEntityManager(async (manager) => {
      for (const item of sortData) {
        await manager.getRepository(EventAttachmentEntity).update(
          { id: item.id, eventId },
          { sortOrder: item.sortOrder },
        );
      }
    });
  }
}
