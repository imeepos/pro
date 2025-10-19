import { MongoClient, Db, Collection, IndexSpecification } from 'mongodb';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * MongoDB原始数据集成测试
 * 测试原始数据存储、去重机制、大文档处理和索引性能
 */
describe('MongoRawDataIntegrationTest', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let rawCollection: Collection;
  let metadataCollection: Collection;

  // 集合名称
  const RAW_DATA_COLLECTION = 'raw_weibo_data';
  const METADATA_COLLECTION = 'raw_data_metadata';

  beforeAll(async () => {
    // 启动内存MongoDB服务器
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // 创建客户端连接
    client = new MongoClient(mongoUri);
    await client.connect();

    db = client.db('test_pro_mongodb');
    rawCollection = db.collection(RAW_DATA_COLLECTION);
    metadataCollection = db.collection(METADATA_COLLECTION);

    // 创建索引
    await setupIndexes();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // 清理测试数据
    await rawCollection.deleteMany({});
    await metadataCollection.deleteMany({});
  });

  afterEach(async () => {
    // 清理任何可能的挂起操作
  });

  /**
   * 设置数据库索引
   */
  async function setupIndexes(): Promise<void> {
    // 原始数据集合索引
    await rawCollection.createIndexes([
      { key: { platform: 1, platformId: 1 }, unique: true },
      { key: { crawledAt: 1 } },
      { key: { dataType: 1 } },
      { key: { keyword: 1 } },
      { key: { contentHash: 1 } },
      { key: { '$**': 'text' } }, // 全文搜索索引
    ]);

    // 元数据集合索引
    await metadataCollection.createIndexes([
      { key: { sourceId: 1, dataType: 1 }, unique: true },
      { key: { lastProcessed: 1 } },
      { key: { status: 1 } },
    ]);
  }

  describe('原始数据存储和检索', () => {
    test('应该存储微博帖子原始数据', async () => {
      const rawPost = {
        platform: 'weibo',
        platformId: 'post_123456789',
        dataType: 'post',
        keyword: '测试关键词',
        crawledAt: new Date(),
        contentHash: 'hash_123456789',
        rawContent: {
          id: '123456789',
          text: '这是一条测试微博内容',
          user: {
            id: 'user_123',
            name: '测试用户',
            profileImageUrl: 'https://example.com/avatar.jpg',
          },
          createdAt: '2024-01-15 10:30:00',
          repostsCount: 10,
          commentsCount: 5,
          attitudesCount: 20,
          pics: ['https://example.com/pic1.jpg'],
        },
        metadata: {
          taskId: 'task_123',
          crawlerVersion: '1.0.0',
          processingStatus: 'raw',
        },
      };

      const result = await rawCollection.insertOne(rawPost);
      expect(result.insertedId).toBeDefined();

      // 验证数据存储
      const stored = await rawCollection.findOne({ _id: result.insertedId });
      expect(stored.platform).toBe('weibo');
      expect(stored.platformId).toBe('post_123456789');
      expect(stored.rawContent.text).toBe('这是一条测试微博内容');
      expect(stored.crawledAt).toBeInstanceOf(Date);
    });

    test('应该存储微博评论原始数据', async () => {
      const rawComment = {
        platform: 'weibo',
        platformId: 'comment_987654321',
        dataType: 'comment',
        parentPostId: 'post_123456789',
        crawledAt: new Date(),
        contentHash: 'hash_987654321',
        rawContent: {
          id: '987654321',
          text: '这是一条测试评论',
          user: {
            id: 'user_456',
            name: '评论用户',
          },
          createdAt: '2024-01-15 11:00:00',
        },
      };

      await rawCollection.insertOne(rawComment);

      // 按数据类型查询
      const comments = await rawCollection.find({
        dataType: 'comment',
        parentPostId: 'post_123456789'
      }).toArray();

      expect(comments).toHaveLength(1);
      expect(comments[0].rawContent.text).toBe('这是一条测试评论');
    });

    test('应该支持复杂查询和聚合', async () => {
      // 插入测试数据
      const testData = [
        {
          platform: 'weibo',
          platformId: 'post_1',
          dataType: 'post',
          keyword: '关键词A',
          crawledAt: new Date('2024-01-15T10:00:00Z'),
          rawContent: { text: '包含关键词A的内容', user: { name: '用户1' } },
        },
        {
          platform: 'weibo',
          platformId: 'post_2',
          dataType: 'post',
          keyword: '关键词B',
          crawledAt: new Date('2024-01-15T11:00:00Z'),
          rawContent: { text: '包含关键词B的内容', user: { name: '用户2' } },
        },
        {
          platform: 'weibo',
          platformId: 'comment_1',
          dataType: 'comment',
          parentPostId: 'post_1',
          crawledAt: new Date('2024-01-15T12:00:00Z'),
          rawContent: { text: '评论内容', user: { name: '评论用户' } },
        },
      ];

      await rawCollection.insertMany(testData);

      // 聚合查询：统计每种数据类型的数量
      const typeStats = await rawCollection.aggregate([
        { $group: { _id: '$dataType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      expect(typeStats).toHaveLength(2);
      expect(typeStats[0]._id).toBe('post');
      expect(typeStats[0].count).toBe(2);
      expect(typeStats[1]._id).toBe('comment');
      expect(typeStats[1].count).toBe(1);

      // 时间范围查询
      const timeRangeResults = await rawCollection.find({
        crawledAt: {
          $gte: new Date('2024-01-15T10:30:00Z'),
          $lte: new Date('2024-01-15T12:00:00Z'),
        },
      }).toArray();

      expect(timeRangeResults).toHaveLength(2);
    });
  });

  describe('数据去重机制验证', () => {
    test('应该防止重复存储相同数据', async () => {
      const duplicateData = {
        platform: 'weibo',
        platformId: 'duplicate_post',
        dataType: 'post',
        crawledAt: new Date(),
        rawContent: { text: '重复内容测试' },
      };

      // 第一次插入应该成功
      await rawCollection.insertOne(duplicateData);

      // 第二次插入相同数据应该失败
      await expect(
        rawCollection.insertOne(duplicateData)
      ).rejects.toThrow();

      // 验证只有一条数据
      const count = await rawCollection.countDocuments({
        platformId: 'duplicate_post'
      });
      expect(count).toBe(1);
    });

    test('应该支持内容哈希去重', async () => {
      const data1 = {
        platform: 'weibo',
        platformId: 'hash_test_1',
        dataType: 'post',
        contentHash: 'same_hash_123',
        crawledAt: new Date(),
        rawContent: { text: '相同内容的帖子1' },
      };

      const data2 = {
        platform: 'weibo',
        platformId: 'hash_test_2',
        dataType: 'post',
        contentHash: 'same_hash_123', // 相同的内容哈希
        crawledAt: new Date(),
        rawContent: { text: '相同内容的帖子2' },
      };

      await rawCollection.insertMany([data1, data2]);

      // 查找具有相同内容哈希的数据
      const duplicateHashes = await rawCollection.find({
        contentHash: 'same_hash_123'
      }).toArray();

      expect(duplicateHashes).toHaveLength(2);

      // 可以根据内容哈希查找重复内容
      const uniqueHashes = await rawCollection.distinct('contentHash');
      expect(uniqueHashes).toHaveLength(1);
    });

    test('应该支持批量去重操作', async () => {
      const batchData = [
        { platform: 'weibo', platformId: 'batch_1', dataType: 'post', rawContent: { text: '内容1' } },
        { platform: 'weibo', platformId: 'batch_2', dataType: 'post', rawContent: { text: '内容2' } },
        { platform: 'weibo', platformId: 'batch_1', dataType: 'post', rawContent: { text: '内容1' } }, // 重复
      ];

      // 使用upsert进行批量去重插入
      const bulkOps = batchData.map(data => ({
        updateOne: {
          filter: { platform: data.platform, platformId: data.platformId },
          update: { $set: data },
          upsert: true,
        },
      }));

      await rawCollection.bulkWrite(bulkOps);

      // 验证去重结果
      const count = await rawCollection.countDocuments({
        platformId: { $in: ['batch_1', 'batch_2'] }
      });
      expect(count).toBe(2);
    });
  });

  describe('大文档处理测试', () => {
    test('应该处理大型原始数据文档', async () => {
      // 创建包含大量数据的文档
      const largeContent = {
        platform: 'weibo',
        platformId: 'large_post',
        dataType: 'post',
        crawledAt: new Date(),
        rawContent: {
          text: '这是一个包含大量数据的帖子'.repeat(1000),
          user: {
            id: 'large_user',
            name: '大内容用户',
            description: '用户描述'.repeat(500),
          },
          // 模拟大量评论数据
          comments: Array.from({ length: 100 }, (_, i) => ({
            id: `comment_${i}`,
            text: `评论内容 ${i}`.repeat(100),
            user: { name: `评论用户 ${i}` },
          })),
          // 模拟大量图片数据
          images: Array.from({ length: 50 }, (_, i) => ({
            url: `https://example.com/image_${i}.jpg`,
            size: 1024 * 1024 * (i + 1), // 1MB 到 50MB
            metadata: {
              width: 1920,
              height: 1080,
              exif: 'exif_data'.repeat(1000),
            },
          })),
        },
      };

      const result = await rawCollection.insertOne(largeContent);
      expect(result.insertedId).toBeDefined();

      // 验证大文档可以被完整检索
      const retrieved = await rawCollection.findOne({ _id: result.insertedId });
      expect(retrieved.rawContent.comments).toHaveLength(100);
      expect(retrieved.rawContent.images).toHaveLength(50);
      expect(retrieved.rawContent.text.length).toBeGreaterThan(10000);
    });

    test('应该处理文档大小限制', async () => {
      // MongoDB文档大小限制为16MB
      const veryLargeContent = {
        platform: 'weibo',
        platformId: 'very_large_post',
        dataType: 'post',
        rawContent: {
          text: 'x'.repeat(17 * 1024 * 1024), // 17MB，超过限制
        },
      };

      await expect(
        rawCollection.insertOne(veryLargeContent)
      ).rejects.toThrow();
    });

    test('应该支持流式处理大型结果集', async () => {
      // 插入大量测试数据
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        platform: 'weibo',
        platformId: `stream_post_${i}`,
        dataType: 'post',
        crawledAt: new Date(),
        rawContent: {
          text: `流式处理测试内容 ${i}`,
          user: { name: `用户 ${i}` },
        },
      }));

      await rawCollection.insertMany(largeDataSet);

      // 使用游标进行流式处理
      const cursor = rawCollection.find({}).batchSize(100);
      let processedCount = 0;

      for await (const doc of cursor) {
        expect(doc.rawContent.text).toContain('流式处理测试内容');
        processedCount++;
      }

      expect(processedCount).toBe(1000);
    });
  });

  describe('索引性能验证', () => {
    test('应该验证平台ID索引性能', async () => {
      // 插入测试数据
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        platform: 'weibo',
        platformId: `perf_test_${i}`,
        dataType: 'post',
        crawledAt: new Date(),
        rawContent: { text: `性能测试内容 ${i}` },
      }));

      await rawCollection.insertMany(testData);

      // 测试索引查询性能
      const start = Date.now();
      const result = await rawCollection.findOne({
        platform: 'weibo',
        platformId: 'perf_test_5000'
      });
      const queryTime = Date.now() - start;

      expect(result).toBeDefined();
      expect(result.platformId).toBe('perf_test_5000');
      expect(queryTime).toBeLessThan(50); // 索引应该使查询很快

      // 验证索引使用情况
      const explainResult = await rawCollection.find({
        platform: 'weibo',
        platformId: 'perf_test_5000'
      }).explain('executionStats');

      expect(explainResult.executionStats.totalDocsExamined).toBe(1);
    });

    test('应该验证全文搜索索引性能', async () => {
      // 插入包含不同关键词的测试数据
      const searchTexts = [
        '人工智能和机器学习的发展',
        '区块链技术的应用前景',
        '云计算和大数据分析',
        '物联网和智能家居',
        '5G网络和移动通信',
      ];

      const testDocs = searchTexts.map((text, i) => ({
        platform: 'weibo',
        platformId: `search_test_${i}`,
        dataType: 'post',
        crawledAt: new Date(),
        rawContent: { text },
      }));

      await rawCollection.insertMany(testDocs);

      // 全文搜索测试
      const start = Date.now();
      const searchResults = await rawCollection.find({
        $text: { $search: '人工智能' }
      }).toArray();
      const searchTime = Date.now() - start;

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].rawContent.text).toContain('人工智能');
      expect(searchTime).toBeLessThan(100);
    });

    test('应该验证复合索引性能', async () => {
      // 插入时间序列数据
      const timeSeriesData = Array.from({ length: 5000 }, (_, i) => ({
        platform: 'weibo',
        platformId: `time_series_${i}`,
        dataType: i % 3 === 0 ? 'post' : i % 3 === 1 ? 'comment' : 'user',
        crawledAt: new Date(Date.now() - i * 60000), // 每分钟一条数据
        rawContent: { text: `时间序列数据 ${i}` },
      }));

      await rawCollection.insertMany(timeSeriesData);

      // 复合查询：按数据类型和时间范围
      const start = Date.now();
      const results = await rawCollection.find({
        dataType: 'post',
        crawledAt: {
          $gte: new Date(Date.now() - 60 * 60000), // 最近1小时
          $lte: new Date(),
        },
      }).sort({ crawledAt: -1 }).toArray();
      const queryTime = Date.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100);
    });
  });

  describe('数据生命周期管理', () => {
    test('应该支持TTL自动过期', async () => {
      // 创建带有TTL索引的集合
      const ttlCollection = db.collection('ttl_test');
      await ttlCollection.createIndex(
        { expireAt: 1 },
        { expireAfterSeconds: 2 } // 2秒后自动过期
      );

      // 插入即将过期的数据
      const expiredDoc = {
        platform: 'weibo',
        platformId: 'expire_test',
        expireAt: new Date(Date.now() + 1000), // 1秒后过期
        rawContent: { text: '即将过期的数据' },
      };

      await ttlCollection.insertOne(expiredDoc);

      // 立即查询应该存在
      let count = await ttlCollection.countDocuments({ platformId: 'expire_test' });
      expect(count).toBe(1);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 再次查询应该已被删除
      count = await ttlCollection.countDocuments({ platformId: 'expire_test' });
      expect(count).toBe(0);
    });

    test('应该支持数据归档策略', async () => {
      // 创建历史数据和当前数据
      const historicalDate = new Date('2023-01-01');
      const currentDate = new Date();

      await rawCollection.insertMany([
        {
          platform: 'weibo',
          platformId: 'historical_1',
          dataType: 'post',
          crawledAt: historicalDate,
          isArchived: false,
          rawContent: { text: '历史数据1' },
        },
        {
          platform: 'weibo',
          platformId: 'historical_2',
          dataType: 'post',
          crawledAt: historicalDate,
          isArchived: false,
          rawContent: { text: '历史数据2' },
        },
        {
          platform: 'weibo',
          platformId: 'current_1',
          dataType: 'post',
          crawledAt: currentDate,
          isArchived: false,
          rawContent: { text: '当前数据' },
        },
      ]);

      // 归档历史数据
      const archiveResult = await rawCollection.updateMany(
        {
          crawledAt: { $lt: new Date('2024-01-01') },
          isArchived: false,
        },
        {
          $set: { isArchived: true, archivedAt: new Date() },
        }
      );

      expect(archiveResult.modifiedCount).toBe(2);

      // 验证归档状态
      const archivedCount = await rawCollection.countDocuments({
        isArchived: true
      });
      const currentCount = await rawCollection.countDocuments({
        isArchived: false
      });

      expect(archivedCount).toBe(2);
      expect(currentCount).toBe(1);
    });

    test('应该支持数据清理策略', async () => {
      // 创建需要清理的数据
      const cleanupDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90天前

      await rawCollection.insertMany([
        {
          platform: 'weibo',
          platformId: 'cleanup_1',
          dataType: 'post',
          crawledAt: cleanupDate,
          status: 'processed',
          rawContent: { text: '需要清理的数据1' },
        },
        {
          platform: 'weibo',
          platformId: 'cleanup_2',
          dataType: 'post',
          crawledAt: cleanupDate,
          status: 'processed',
          rawContent: { text: '需要清理的数据2' },
        },
        {
          platform: 'weibo',
          platformId: 'keep_1',
          dataType: 'post',
          crawledAt: new Date(),
          status: 'processed',
          rawContent: { text: '需要保留的数据' },
        },
      ]);

      // 清理90天前的已处理数据
      const cleanupResult = await rawCollection.deleteMany({
        crawledAt: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }, // 60天前
        status: 'processed',
      });

      expect(cleanupResult.deletedCount).toBe(2);

      // 验证清理结果
      const remainingCount = await rawCollection.countDocuments({
        crawledAt: { $lt: cleanupDate }
      });
      expect(remainingCount).toBe(0);
    });
  });

  describe('元数据管理', () => {
    test('应该跟踪数据处理状态', async () => {
      const sourceId = 'source_12345';
      const dataType = 'post';

      // 创建元数据记录
      const metadata = {
        sourceId,
        dataType,
        status: 'raw',
        createdAt: new Date(),
        lastProcessed: new Date(),
        processingAttempts: 0,
        errorCount: 0,
        metadata: {
          source: 'weibo_crawler',
          version: '1.0.0',
          taskId: 'task_123',
        },
      };

      await metadataCollection.insertOne(metadata);

      // 查询元数据
      const retrieved = await metadataCollection.findOne({
        sourceId,
        dataType,
      });

      expect(retrieved.status).toBe('raw');
      expect(retrieved.processingAttempts).toBe(0);

      // 更新处理状态
      await metadataCollection.updateOne(
        { sourceId, dataType },
        {
          $set: {
            status: 'processing',
            lastProcessed: new Date(),
          },
          $inc: { processingAttempts: 1 },
        }
      );

      const updated = await metadataCollection.findOne({
        sourceId,
        dataType,
      });

      expect(updated.status).toBe('processing');
      expect(updated.processingAttempts).toBe(1);
    });

    test('应该支持处理状态监控', async () => {
      // 创建不同状态的元数据记录
      const metadataRecords = [
        { sourceId: 'source_1', dataType: 'post', status: 'raw' },
        { sourceId: 'source_2', dataType: 'post', status: 'processing' },
        { sourceId: 'source_3', dataType: 'post', status: 'completed' },
        { sourceId: 'source_4', dataType: 'post', status: 'failed' },
        { sourceId: 'source_5', dataType: 'comment', status: 'raw' },
      ];

      await metadataCollection.insertMany(metadataRecords);

      // 统计各状态数量
      const statusStats = await metadataCollection.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray();

      expect(statusStats).toHaveLength(4);

      // 查找失败的处理记录
      const failedRecords = await metadataCollection.find({
        status: 'failed',
      }).toArray();

      expect(failedRecords).toHaveLength(1);
      expect(failedRecords[0].sourceId).toBe('source_4');
    });
  });
});