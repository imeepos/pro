import { GraphQLClient } from '../client/graphql-client.js';
import { Attachment, FileType, UploadOptions } from '../types/attachment.types.js';

interface AttachmentUploadCredential {
  token: string;
  uploadUrl?: string;
  objectKey: string;
  bucketName: string;
  expiresAt: Date;
  requiresUpload: boolean;
}

interface RequestEventAttachmentUploadResponse {
  requestEventAttachmentUpload: AttachmentUploadCredential;
}

interface ConfirmEventAttachmentUploadResponse {
  confirmEventAttachmentUpload: Attachment;
}

export class AttachmentApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async uploadAttachment(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    try {
      const fileMd5 = await this.calculateFileMd5(file);

      const credential = await this.requestUpload({
        eventId: eventId.toString(),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileMd5,
      });

      if (credential.requiresUpload && credential.uploadUrl) {
        await this.uploadToStorage(credential.uploadUrl, file, options?.onProgress);
      }

      const attachment = await this.confirmUpload(credential.token);
      options?.onSuccess?.(attachment);
      return attachment;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('上传失败');
      options?.onError?.(err);
      throw err;
    }
  }

  async uploadImage(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.IMAGE);
    return this.uploadAttachment(eventId, file, options);
  }

  async uploadVideo(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.VIDEO);
    return this.uploadAttachment(eventId, file, options);
  }

  async uploadDocument(
    eventId: number,
    file: File,
    options?: UploadOptions
  ): Promise<Attachment> {
    this.validateFileType(file, FileType.DOCUMENT);
    return this.uploadAttachment(eventId, file, options);
  }

  async getAttachments(eventId: number): Promise<Attachment[]> {
    const query = `
      query Event($id: ID!) {
        event(id: $id) {
          attachments {
            id
            eventId
            fileName
            fileUrl
            bucketName
            objectName
            fileType
            fileSize
            mimeType
            fileMd5
            sortOrder
            createdAt
          }
        }
      }
    `;

    const response = await this.client.query<{ event: { attachments: Attachment[] } }>(
      query,
      { id: eventId.toString() }
    );
    return response.event.attachments;
  }

  async deleteAttachment(eventId: number, attachmentId: number): Promise<void> {
    const mutation = `
      mutation RemoveEventAttachment($eventId: ID!, $attachmentId: ID!) {
        removeEventAttachment(eventId: $eventId, attachmentId: $attachmentId)
      }
    `;

    await this.client.mutate(mutation, {
      eventId: eventId.toString(),
      attachmentId: attachmentId.toString(),
    });
  }

  async updateSort(eventId: number, sortData: Array<{ id: string; sortOrder: number }>): Promise<void> {
    const mutation = `
      mutation UpdateEventAttachmentsSort($eventId: ID!, $attachments: [UpdateAttachmentSortInput!]!) {
        updateEventAttachmentsSort(eventId: $eventId, attachments: $attachments)
      }
    `;

    await this.client.mutate(mutation, {
      eventId: eventId.toString(),
      attachments: sortData,
    });
  }

  private async requestUpload(input: {
    eventId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileMd5: string;
  }): Promise<AttachmentUploadCredential> {
    const mutation = `
      mutation RequestEventAttachmentUpload($input: RequestAttachmentUploadInput!) {
        requestEventAttachmentUpload(input: $input) {
          token
          uploadUrl
          objectKey
          bucketName
          expiresAt
          requiresUpload
        }
      }
    `;

    const response = await this.client.mutate<RequestEventAttachmentUploadResponse>(
      mutation,
      { input }
    );
    return response.requestEventAttachmentUpload;
  }

  private async uploadToStorage(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  private async confirmUpload(token: string): Promise<Attachment> {
    const mutation = `
      mutation ConfirmEventAttachmentUpload($input: ConfirmAttachmentUploadInput!) {
        confirmEventAttachmentUpload(input: $input) {
          id
          eventId
          fileName
          fileUrl
          bucketName
          objectName
          fileType
          fileSize
          mimeType
          fileMd5
          sortOrder
          createdAt
        }
      }
    `;

    const response = await this.client.mutate<ConfirmEventAttachmentUploadResponse>(
      mutation,
      { input: { token } }
    );
    return response.confirmEventAttachmentUpload;
  }

  private async calculateFileMd5(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('MD5', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private validateFileType(file: File, expectedType: FileType): void {
    const mimeType = file.type.toLowerCase();

    switch (expectedType) {
      case FileType.IMAGE:
        if (!mimeType.startsWith('image/')) {
          throw new Error('文件必须是图片格式');
        }
        break;
      case FileType.VIDEO:
        if (!mimeType.startsWith('video/')) {
          throw new Error('文件必须是视频格式');
        }
        break;
      case FileType.DOCUMENT:
        const docTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!docTypes.includes(mimeType)) {
          throw new Error('文件必须是文档格式（PDF、Word、Excel）');
        }
        break;
    }
  }
}
