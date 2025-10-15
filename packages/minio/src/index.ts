import * as Minio from 'minio';

export interface MinIOConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

export class MinIOClient {
  private client: Minio.Client;

  constructor(config: MinIOConfig) {
    this.client = new Minio.Client(config);
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    return this.client.bucketExists(bucketName);
  }

  async makeBucket(bucketName: string, region?: string): Promise<void> {
    const exists = await this.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, region || 'us-east-1');
    }
  }

  async uploadFile(
    bucketName: string,
    objectName: string,
    filePath: string,
  ): Promise<void> {
    await this.client.fPutObject(bucketName, objectName, filePath);
  }

  async uploadBuffer(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
  ): Promise<void> {
    await this.client.putObject(bucketName, objectName, buffer);
  }

  async downloadFile(
    bucketName: string,
    objectName: string,
    filePath: string,
  ): Promise<void> {
    await this.client.fGetObject(bucketName, objectName, filePath);
  }

  async getObject(bucketName: string, objectName: string): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const stream = await this.client.getObject(bucketName, objectName);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteObject(bucketName: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucketName, objectName);
  }

  async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    return this.client.presignedGetObject(bucketName, objectName, expiry);
  }

  async getPresignedPutUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 60 * 10,
  ): Promise<string> {
    return this.client.presignedPutObject(bucketName, objectName, expiry);
  }

  async statObject(bucketName: string, objectName: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(bucketName, objectName);
  }
}
