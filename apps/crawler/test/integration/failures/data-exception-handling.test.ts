import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CrawlerModule } from '../../src/crawler.module';
import { WeiboCrawlerService } from '../../src/services/weibo-crawler.service';
import { DataProcessorService } from '../../src/services/data-processor.service';
import { StorageService } from '../../src/services/storage.service';
import { DataValidatorService } from '../../src/services/data-validator.service';
import { Logger } from '@pro/logger';
import { setTimeout } from 'timers/promises';

describe('DataExceptionHandlingTest', () => {
  let app: INestApplication;
  let crawlerService: WeiboCrawlerService;
  let dataProcessor: DataProcessorService;
  let storageService: StorageService;
  let dataValidator: DataValidatorService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    crawlerService = moduleFixture.get<WeiboCrawlerService>(WeiboCrawlerService);
    dataProcessor = moduleFixture.get<DataProcessorService>(DataProcessorService);
    storageService = moduleFixture.get<StorageService>(StorageService);
    dataValidator = moduleFixture.get<DataValidatorService>(DataValidatorService);
    logger = moduleFixture.get<Logger>(Logger);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('数据格式错误处理', () => {
    it('应该处理JSON解析错误并恢复', async () => {
      const malformedJsonData = {
        id: 'test_post_001',
        content: 'Valid content',
        metadata: '{"invalid": json structure}',
        timestamp: Date.now()
      };

      const processingResult = await dataProcessor.processPostData(malformedJsonData);
      expect(processingResult.success).toBe(false);
      expect(processingResult.errors).toContain('Invalid JSON format');

      const recoveryResult = await dataProcessor.attemptDataRecovery(malformedJsonData);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.processedData.metadata).toEqual({});
      expect(recoveryResult.recoveryActions).toContain('json_parse_error_fixed');
    });

    it('应该验证和处理字段缺失问题', async () => {
      const incompleteData = {
        id: 'incomplete_post_002',
        content: 'Test content',
        author: undefined,
        timestamp: null,
        likes: 'not_a_number'
      };

      const validationResult = await dataValidator.validatePostData(incompleteData);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.missingFields).toContain('author');
      expect(validationResult.invalidFields).toContain('likes');
      expect(validationResult.nullFields).toContain('timestamp');

      const sanitizedData = await dataValidator.sanitizeAndFixData(incompleteData);
      expect(sanitizedData.author).toBe('');
      expect(sanitizedData.timestamp).toBeInstanceOf(Date);
      expect(sanitizedData.likes).toBe(0);
    });

    it('应该处理编码问题和特殊字符', async () => {
      const encodingTestData = {
        id: 'encoding_test_003',
        content: 'Content with special chars: 测试 🎉 "quotes" & symbols',
        title: 'Title\u0000with\u0001control\u0002characters',
        author: 'Author with null byte\0termination',
        tags: ['tag1', 'tag2', null, undefined, '']
      };

      const processedData = await dataProcessor.handleEncodingIssues(encodingTestData);
      expect(processedData.content).toContain('测试');
      expect(processedData.title).not.toContain('\u0000');
      expect(processedData.author).not.toContain('\0');
      expect(processedData.tags).toEqual(['tag1', 'tag2']);
    });

    it('应该记录数据格式错误的统计信息', async () => {
      const errorStatsSpy = jest.spyOn(dataProcessor, 'recordErrorStatistics');

      const malformedBatch = [
        { id: '1', data: '{"invalid": json}' },
        { id: '2', data: null },
        { id: '3', data: '{"valid": "json"}' },
        { id: '4', data: undefined }
      ];

      const batchResult = await dataProcessor.processBatch(malformedBatch);
      expect(batchResult.successCount).toBe(1);
      expect(batchResult.errorCount).toBe(3);

      expect(errorStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorTypes: ['json_parse_error', 'null_data', 'undefined_data'],
          totalProcessed: 4,
          errorRate: 0.75
        })
      );

      errorStatsSpy.mockRestore();
    });
  });

  describe('大数据量处理测试', () => {
    it('应该处理大批量数据而不内存溢出', async () => {
      const largeDatasetSize = 10000;
      const largeDataset = [];

      for (let i = 0; i < largeDatasetSize; i++) {
        largeDataset.push({
          id: `large_item_${i}`,
          content: `Large content item number ${i} with substantial text to simulate real data`,
          metadata: {
            category: `category_${i % 10}`,
            tags: [`tag_${i % 100}`, `secondary_tag_${i % 50}`],
            numericValue: i,
            timestamp: Date.now() + i
          }
        });
      }

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await dataProcessor.processLargeDataset(largeDataset, {
        batchSize: 1000,
        maxConcurrency: 5,
        memoryThreshold: 100 * 1024 * 1024
      });

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      expect(result.processedCount).toBe(largeDatasetSize);
      expect(result.successCount).toBe(largeDatasetSize);
      expect(endTime - startTime).toBeLessThan(30000);
      expect(memoryAfter - memoryBefore).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该在内存压力下优雅降级', async () => {
      const memoryMonitorSpy = jest.spyOn(process, 'memoryUsage');
      memoryMonitorSpy.mockReturnValue({
        heapUsed: 900 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        rss: 950 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 20 * 1024 * 1024
      });

      const memoryPressureDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `pressure_item_${i}`,
        data: 'x'.repeat(10000)
      }));

      const result = await dataProcessor.processWithMemoryManagement(memoryPressureDataset);
      expect(result.strategy).toBe('memory_safe');
      expect(result.batchSize).toBeLessThan(100);
      expect(result.processedCount).toBe(memoryPressureDataset.length);
      expect(result.memoryWarnings).toBeGreaterThan(0);

      memoryMonitorSpy.mockRestore();
    });

    it('应该实现流式处理避免内存积累', async () => {
      const streamDataGenerator = async function* () {
        for (let i = 0; i < 10000; i++) {
          yield {
            id: `stream_item_${i}`,
            content: `Stream content ${i}`,
            timestamp: Date.now() + i
          };
          if (i % 1000 === 0) {
            await setTimeout(10);
          }
        }
      };

      let processedCount = 0;
      const memorySnapshots = [];

      const streamProcessor = dataProcessor.createStreamProcessor({
        onItem: async (item) => {
          processedCount++;
          if (processedCount % 2000 === 0) {
            memorySnapshots.push(process.memoryUsage().heapUsed);
          }
          return { processed: true, item: item.id };
        },
        batchSize: 100
      });

      const result = await streamProcessor.process(streamDataGenerator());

      expect(result.totalProcessed).toBe(10000);
      expect(processedCount).toBe(10000);
      expect(memorySnapshots.length).toBe(5);

      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('存储空间不足处理', () => {
    it('应该在存储空间不足时切换到备用存储', async () => {
      const storageCheckSpy = jest.spyOn(storageService, 'checkAvailableSpace');
      storageCheckSpy.mockResolvedValue({
        available: 10 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        threshold: 50 * 1024 * 1024,
        critical: true
      });

      const testData = {
        id: 'storage_pressure_test',
        content: 'Large data content',
        size: 5 * 1024 * 1024
      };

      const result = await storageService.storeWithFallback(testData, [
        'primary',
        'secondary',
        'archive'
      ]);

      expect(result.success).toBe(true);
      expect(result.usedStorage).toBe('secondary');
      expect(result.reason).toContain('Primary storage full');

      storageCheckSpy.mockRestore();
    });

    it('应该实现数据压缩以节省存储空间', async () => {
      const largeContent = 'x'.repeat(1024 * 1024);
      const compressibleData = {
        id: 'compression_test',
        content: largeContent,
        metadata: { type: 'text', compressible: true }
      };

      const compressionResult = await storageService.storeWithCompression(compressibleData);
      expect(compressionResult.compressed).toBe(true);
      expect(compressionResult.originalSize).toBe(largeContent.length);
      expect(compressionResult.compressedSize).toBeLessThan(compressionResult.originalSize * 0.3);
      expect(compressionResult.compressionRatio).toBeLessThan(0.3);
    });

    it('应该在所有存储都不可用时优雅降级', async () => {
      const storageFailures = ['primary', 'secondary', 'archive'];

      for (const storage of storageFailures) {
        jest.spyOn(storageService, `storeTo${storage.charAt(0).toUpperCase() + storage.slice(1)}`)
          .mockRejectedValue(new Error(`${storage} storage unavailable`));
      }

      const testData = {
        id: 'all_storage_failed',
        content: 'Test data when all storage failed'
      };

      const result = await storageService.storeWithFallback(testData, storageFailures);
      expect(result.success).toBe(false);
      expect(result.error).toContain('All storage options failed');
      expect(result.failedStorages).toEqual(storageFailures);

      for (const storage of storageFailures) {
        jest.restoreAllMocks();
      }
    });

    it('应该实施存储清理策略释放空间', async () => {
      const cleanupSpy = jest.spyOn(storageService, 'executeCleanupStrategy');
      cleanupSpy.mockResolvedValue({
        freedSpace: 200 * 1024 * 1024,
        deletedFiles: 150,
        archivedFiles: 50
      });

      const storageMetrics = await storageService.analyzeStorageUsage();
      expect(storageMetrics.spaceUsagePercentage).toBeGreaterThan(80);

      const cleanupResult = await storageService.performAutomaticCleanup();
      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.freedSpace).toBe(200 * 1024 * 1024);
      expect(cleanupResult.actionsPerformed).toContain('delete_old_files');
      expect(cleanupResult.actionsPerformed).toContain('archive_large_files');

      cleanupSpy.mockRestore();
    });
  });

  describe('数据损坏恢复测试', () => {
    it('应该检测和修复损坏的数据文件', async () => {
      const corruptedData = {
        id: 'corrupted_data_001',
        content: 'Original content',
        checksum: 'invalid_checksum_value',
        size: 1024
      };

      const validationResult = await dataValidator.verifyDataIntegrity(corruptedData);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Checksum mismatch');

      const recoveryResult = await dataProcessor.repairCorruptedData(corruptedData);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.repairedData.checksum).not.toBe('invalid_checksum_value');
      expect(recoveryResult.repairActions).toContain('checksum_recalculated');
    });

    it('应该从备份中恢复损坏的数据', async () => {
      const originalData = {
        id: 'backup_recovery_test',
        content: 'Important content that needs backup',
        timestamp: Date.now()
      };

      await storageService.createBackup(originalData);

      const corruptedVersion = {
        ...originalData,
        content: 'CORRUPTED CONTENT',
        corrupted: true
      };

      const recoveryResult = await storageService.restoreFromBackup(originalData.id);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.restoredData.content).toBe(originalData.content);
      expect(recoveryResult.restoredData.corrupted).toBeUndefined();
    });

    it('应该实施数据版本控制防止丢失', async () => {
      const dataId = 'version_control_test';
      const versions = [
        { id: dataId, content: 'Version 1', timestamp: Date.now() - 3000 },
        { id: dataId, content: 'Version 2', timestamp: Date.now() - 2000 },
        { id: dataId, content: 'Version 3', timestamp: Date.now() - 1000 }
      ];

      for (const version of versions) {
        await storageService.saveVersion(dataId, version);
      }

      const versionHistory = await storageService.getVersionHistory(dataId);
      expect(versionHistory.length).toBe(3);
      expect(versionHistory[0].content).toBe('Version 3');
      expect(versionHistory[2].content).toBe('Version 1');

      const restoredVersion = await storageService.restoreVersion(dataId, 1);
      expect(restoredVersion.content).toBe('Version 2');
    });
  });

  describe('数据回滚机制验证', () => {
    it('应该在批量处理失败时回滚所有更改', async () => {
      const transactionId = await dataProcessor.beginTransaction();

      const dataItems = [
        { id: 'rollback_item_1', content: 'Content 1' },
        { id: 'rollback_item_2', content: 'Content 2' },
        { id: 'rollback_item_3', content: 'Content 3' }
      ];

      for (const item of dataItems) {
        await dataProcessor.processItemInTransaction(transactionId, item);
      }

      const simulateFailure = true;
      if (simulateFailure) {
        await dataProcessor.rollbackTransaction(transactionId);
      }

      const checkItems = await Promise.all(
        dataItems.map(item => storageService.itemExists(item.id))
      );

      expect(checkItems.every(exists => !exists)).toBe(true);
    });

    it('应该支持部分回滚保留成功的数据', async () => {
      const transactionId = await dataProcessor.beginTransaction();

      const successfulItems = [
        { id: 'partial_success_1', content: 'Success 1' },
        { id: 'partial_success_2', content: 'Success 2' }
      ];

      const failedItem = { id: 'partial_failed', content: 'Failed content' };

      for (const item of successfulItems) {
        await dataProcessor.processItemInTransaction(transactionId, item);
      }

      try {
        await dataProcessor.processItemInTransaction(transactionId, failedItem);
        throw new Error('Should have failed');
      } catch (error) {
        await dataProcessor.partialRollback(transactionId, [failedItem.id]);
      }

      const successfulCheck = await Promise.all(
        successfulItems.map(item => storageService.itemExists(item.id))
      );
      const failedCheck = await storageService.itemExists(failedItem.id);

      expect(successfulCheck.every(exists => exists)).toBe(true);
      expect(failedCheck).toBe(false);
    });

    it('应该维护详细的操作日志用于审计', async () => {
      const auditSpy = jest.spyOn(dataProcessor, 'logOperation');

      const operations = [
        { type: 'create', itemId: 'audit_item_1', data: { content: 'Audit 1' } },
        { type: 'update', itemId: 'audit_item_1', data: { content: 'Updated Audit 1' } },
        { type: 'delete', itemId: 'audit_item_2' }
      ];

      for (const operation of operations) {
        await dataProcessor.executeWithAuditLog(operation);
      }

      expect(auditSpy).toHaveBeenCalledTimes(3);

      const auditLog = await dataProcessor.getAuditLog();
      expect(auditLog.entries).toHaveLength(3);
      expect(auditLog.entries[0]).toMatchObject({
        operation: 'create',
        itemId: 'audit_item_1',
        timestamp: expect.any(Number),
        success: true
      });

      auditSpy.mockRestore();
    });

    it('应该定期创建数据快照用于灾难恢复', async () => {
      const snapshotSpy = jest.spyOn(storageService, 'createSnapshot');
      snapshotSpy.mockResolvedValue({
        snapshotId: 'snapshot_2024_01_01_00_00',
        createdAt: new Date(),
        itemsCount: 1000,
        size: 50 * 1024 * 1024,
        location: 'snapshot_storage/main_snapshot_20240101'
      });

      const snapshotResult = await storageService.performScheduledSnapshot();
      expect(snapshotResult.success).toBe(true);
      expect(snapshotResult.snapshotId).toBe('snapshot_2024_01_01_00_00');
      expect(snapshotResult.itemsIncluded).toBe(1000);

      const restoreTest = await storageService.restoreFromSnapshot(snapshotResult.snapshotId);
      expect(restoreTest.success).toBe(true);
      expect(restoreTest.restoredItems).toBe(1000);

      snapshotSpy.mockRestore();
    });
  });
});