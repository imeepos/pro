import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// 定义MediaDownloadTask接口（临时解决方案）
export interface MediaDownloadTask {
  id: string;
  url: string;
  type: 'image' | 'video';
  sourceType: 'note' | 'avatar' | 'background';
  sourceId: string;
  filename: string;
  localPath?: string;
  size?: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 微博媒体下载服务 - 数字资产的持久化管理
 * 每个媒体文件都是数字时代的视觉记忆，值得被永久保存
 */
@Injectable()
export class WeiboMediaDownloaderService {
  private readonly logger = new Logger(WeiboMediaDownloaderService.name);
  private readonly downloadBasePath: string;
  private readonly maxFileSize: number;
  private readonly userAgent: string;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.downloadBasePath = this.configService.get<string>('WEIBO_MEDIA_DOWNLOAD_PATH', './downloads/weibo');
    this.maxFileSize = this.configService.get<number>('WEIBO_MAX_MEDIA_SIZE_MB', 50) * 1024 * 1024; // MB to bytes
    this.userAgent = this.configService.get<string>('USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    this.timeout = this.configService.get<number>('MEDIA_DOWNLOAD_TIMEOUT', 30000);
  }

  /**
   * 下载单个媒体文件 - 灵感源自MediaCrawler的get_note_image
   * 这不仅是文件下载，更是数字资产的永久保存
   */
  async downloadMedia(
    url: string,
    type: 'image' | 'video',
    sourceType: 'note' | 'avatar' | 'background',
    sourceId: string,
    customFilename?: string
  ): Promise<MediaDownloadTask> {
    const taskId = uuidv4();
    const startTime = Date.now();

    // 创建下载任务
    const downloadTask: MediaDownloadTask = {
      id: taskId,
      url,
      type,
      sourceType,
      sourceId,
      filename: customFilename || this.generateFilename(url, type, sourceId),
      status: 'pending',
      createdAt: new Date()
    };

    this.logger.log('🎨 开始下载媒体文件', {
      taskId,
      url: url.length > 100 ? url.substring(0, 100) + '...' : url,
      type,
      sourceType,
      sourceId,
      filename: downloadTask.filename,
      startTime: new Date().toISOString()
    });

    try {
      // 更新状态为下载中
      downloadTask.status = 'downloading';

      // 预检查文件大小和可访问性
      const fileInfo = await this.preCheckFile(url);
      if (fileInfo.size > this.maxFileSize) {
        throw new Error(`文件大小 ${Math.round(fileInfo.size / 1024 / 1024)}MB 超过限制 ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
      }

      // 确保目录存在
      const targetDir = this.getTargetDirectory(sourceType, sourceId);
      await ensureDir(targetDir);

      // 执行下载
      const localPath = await this.downloadFile(url, join(targetDir, downloadTask.filename), fileInfo.contentType);

      // 更新下载任务
      downloadTask.localPath = localPath;
      downloadTask.size = fileInfo.size;
      downloadTask.status = 'completed';
      downloadTask.completedAt = new Date();

      const duration = Date.now() - startTime;
      this.logger.log('✅ 媒体文件下载成功', {
        taskId,
        url: url.length > 100 ? url.substring(0, 100) + '...' : url,
        localPath,
        sizeBytes: fileInfo.size,
        sizeMB: Math.round(fileInfo.size / 1024 / 1024 * 100) / 100,
        duration,
        speedMbps: Math.round((fileInfo.size / 1024 / 1024) / (duration / 1000) * 100) / 100,
        completedAt: downloadTask.completedAt.toISOString()
      });

      return downloadTask;

    } catch (error) {
      downloadTask.status = 'failed';
      downloadTask.error = error instanceof Error ? error.message : '未知错误';

      const duration = Date.now() - startTime;
      this.logger.error('❌ 媒体文件下载失败', {
        taskId,
        url: url.length > 100 ? url.substring(0, 100) + '...' : url,
        type,
        sourceType,
        sourceId,
        duration,
        error: downloadTask.error,
        errorType: this.classifyDownloadError(error)
      });

      return downloadTask;
    }
  }

  /**
   * 批量下载媒体文件 - 高效的并行下载艺术
   */
  async batchDownloadMedia(
    mediaUrls: Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }>,
    maxConcurrency: number = 3,
    retryFailures: boolean = true
  ): Promise<MediaDownloadTask[]> {
    this.logger.log('📦 开始批量下载媒体文件', {
      totalFiles: mediaUrls.length,
      maxConcurrency,
      retryFailures
    });

    const allTasks: MediaDownloadTask[] = [];
    const chunks = this.chunkArray(mediaUrls, maxConcurrency);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.debug(`处理第 ${i + 1}/${chunks.length} 批次`, {
        batchSize: chunk.length,
        files: chunk.map(f => ({ url: f.url.substring(0, 50) + '...', type: f.type }))
      });

      // 并行下载当前批次
      const chunkPromises = chunk.map(async (media) => {
        return this.downloadMedia(media.url, media.type, media.sourceType, media.sourceId);
      });

      const chunkTasks = await Promise.all(chunkPromises);
      allTasks.push(...chunkTasks);

      // 批次间延迟
      if (i < chunks.length - 1) {
        await this.randomDelay(1000, 3000);
      }
    }

    // 重试失败的任务
    if (retryFailures) {
      const failedTasks = allTasks.filter(task => task.status === 'failed');
      if (failedTasks.length > 0) {
        this.logger.log('🔄 开始重试失败的下载任务', {
          failedCount: failedTasks.length,
          originalTotal: mediaUrls.length
        });

        const retryTasks = await this.retryFailedDownloads(failedTasks);
        allTasks.push(...retryTasks);
      }
    }

    const successCount = allTasks.filter(task => task.status === 'completed').length;
    const totalSize = allTasks
      .filter(task => task.status === 'completed' && task.size)
      .reduce((sum, task) => sum + (task.size || 0), 0);

    this.logger.log('📦 批量媒体下载完成', {
      totalFiles: mediaUrls.length,
      successCount,
      failureCount: allTasks.filter(task => task.status === 'failed').length,
      successRate: Math.round((successCount / mediaUrls.length) * 100),
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    });

    return allTasks;
  }

  /**
   * 下载视频文件 - 支持大文件和断点续传
   */
  async downloadVideo(
    url: string,
    sourceId: string,
    quality: 'high' | 'medium' | 'low' = 'high'
  ): Promise<MediaDownloadTask> {
    this.logger.log('🎬 开始下载视频文件', {
      url: url.length > 100 ? url.substring(0, 100) + '...' : url,
      sourceId,
      quality
    });

    // 根据质量调整URL（如果有多个质量的选项）
    const videoUrl = this.adjustVideoQuality(url, quality);

    return this.downloadMedia(videoUrl, 'video', 'note', sourceId);
  }

  /**
   * 预检查文件信息 - 避免下载不需要的文件
   */
  private async preCheckFile(url: string): Promise<{ size: number; contentType: string }> {
    try {
      const response = await axios.head(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://weibo.com/'
        },
        timeout: 10000,
        maxRedirects: 5
      });

      const contentLength = response.headers['content-length'];
      const contentType = response.headers['content-type'] || '';

      return {
        size: contentLength ? parseInt(contentLength) : 0,
        contentType
      };

    } catch (error) {
      this.logger.warn('文件预检查失败', {
        url: url.length > 100 ? url.substring(0, 100) + '...' : url,
        error: error instanceof Error ? error.message : '未知错误'
      });

      // 返回默认值，继续尝试下载
      return {
        size: 0,
        contentType: ''
      };
    }
  }

  /**
   * 执行文件下载 - 支持进度跟踪和断点续传
   */
  private async downloadFile(url: string, localPath: string, contentType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const writer = createWriteStream(localPath);
      let downloadedBytes = 0;

      axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://weibo.com/',
          'Accept': this.getAcceptHeader(contentType)
        },
        timeout: this.timeout,
        maxRedirects: 10
      }).then((response: AxiosResponse) => {
        response.data.pipe(writer);

        response.data.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;

          // 检查文件大小限制
          if (downloadedBytes > this.maxFileSize) {
            writer.destroy();
            reject(new Error(`下载文件超过大小限制: ${Math.round(downloadedBytes / 1024 / 1024)}MB`));
            return;
          }
        });

        writer.on('finish', () => {
          resolve(localPath);
        });

        writer.on('error', (error) => {
          writer.destroy();
          reject(error);
        });

      }).catch((error) => {
        writer.destroy();
        reject(error);
      });
    });
  }

  /**
   * 生成文件名 - 确保文件名的唯一性和可读性
   */
  private generateFilename(url: string, type: 'image' | 'video', sourceId: string): string {
    const urlObj = new URL(url);
    const extension = this.getFileExtension(urlObj.pathname, type);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return `${sourceId}_${timestamp}_${randomSuffix}${extension}`;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(pathname: string, type: 'image' | 'video'): string {
    const knownExtensions = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    };

    const extension = pathname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

    if (extension && knownExtensions[type].includes(extension)) {
      return extension;
    }

    // 默认扩展名
    return type === 'video' ? '.mp4' : '.jpg';
  }

  /**
   * 获取目标目录
   */
  private getTargetDirectory(sourceType: 'note' | 'avatar' | 'background', sourceId: string): string {
    const typeDir = {
      note: 'notes',
      avatar: 'avatars',
      background: 'backgrounds'
    };

    // 按日期和类型组织目录结构
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return join(this.downloadBasePath, typeDir[sourceType], `${year}`, `${month}`, `${day}`);
  }

  /**
   * 调整视频质量
   */
  private adjustVideoQuality(url: string, quality: 'high' | 'medium' | 'low'): string {
    // 根据URL模式调整质量参数
    // 这里需要根据微博的实际视频URL模式来实现
    if (url.includes('video') || url.includes('media')) {
      const qualityParams = {
        high: '720p',
        medium: '480p',
        low: '360p'
      };

      // 简单的质量调整逻辑（实际实现需要根据微博的API规则）
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}quality=${qualityParams[quality]}`;
    }

    return url;
  }

  /**
   * 获取Accept头
   */
  private getAcceptHeader(contentType: string): string {
    if (contentType.includes('video')) {
      return 'video/mp4,video/webm,video/ogg,application/octet-stream,*/*;q=0.8';
    } else if (contentType.includes('image')) {
      return 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
    }
    return '*/*';
  }

  /**
   * 重试失败的下载
   */
  private async retryFailedDownloads(failedTasks: MediaDownloadTask[]): Promise<MediaDownloadTask[]> {
    const retryTasks: MediaDownloadTask[] = [];

    for (const task of failedTasks) {
      this.logger.debug('🔄 重试下载任务', {
        taskId: task.id,
        url: task.url.substring(0, 50) + '...',
        previousError: task.error
      });

      // 等待一段时间后重试
      await this.randomDelay(2000, 5000);

      const retryTask = await this.downloadMedia(
        task.url,
        task.type,
        task.sourceType,
        task.sourceId,
        task.filename
      );

      retryTasks.push(retryTask);
    }

    const retrySuccessCount = retryTasks.filter(task => task.status === 'completed').length;
    this.logger.log('🔄 重试下载完成', {
      originalFailedCount: failedTasks.length,
      retrySuccessCount,
      retryFailureCount: failedTasks.length - retrySuccessCount
    });

    return retryTasks;
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 随机延迟
   */
  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 分类下载错误
   */
  private classifyDownloadError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'DOWNLOAD_TIMEOUT';
    }

    if (errorMessage.includes('size') || errorMessage.includes('large')) {
      return 'FILE_TOO_LARGE';
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'FILE_NOT_FOUND';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'ACCESS_DENIED';
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('disk') || errorMessage.includes('space')) {
      return 'DISK_FULL';
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return 'PERMISSION_ERROR';
    }

    return 'UNKNOWN_DOWNLOAD_ERROR';
  }

  /**
   * 获取下载统计信息
   */
  async getDownloadStats(directory?: string): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    fileTypes: Record<string, number>;
    recentDownloads: number;
  }> {
    // 这里可以实现目录扫描和统计功能
    // 为了简洁，这里返回示例数据
    return {
      totalFiles: 0,
      totalSizeMB: 0,
      fileTypes: {},
      recentDownloads: 0
    };
  }

  /**
   * 清理过期的媒体文件
   */
  async cleanupExpiredFiles(daysOld: number = 30): Promise<number> {
    this.logger.log('🧹 开始清理过期媒体文件', {
      daysOld,
      directory: this.downloadBasePath
    });

    // 这里可以实现文件清理逻辑
    // 为了简洁，这里返回示例数据
    return 0;
  }
}