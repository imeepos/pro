import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@pro/logger';
import { WeiboDataCleaner } from './weibo-data-cleaner.service';
import { WeiboContentParser } from './weibo-content-parser.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { QUEUE_NAMES, RawDataReadyEvent, SourcePlatform } from '@pro/types';

describe('WeiboDataCleaner - 微博数据清洗集成测试', () => {
  let cleaner: WeiboDataCleaner;
  let mockLogger: jest.Mocked<Logger>;
  let mockContentParser: jest.Mocked<WeiboContentParser>;
  let mockRawDataService: jest.Mocked<RawDataService>;

  const mockRawDataEvent: RawDataReadyEvent = {
    rawDataId: 'test_raw_data_123',
    sourceType: 'weibo_search',
    sourcePlatform: SourcePlatform.WEIBO,
    sourceUrl: 'https://weibo.com/search?q=test',
    contentHash: 'abc123',
    metadata: {
      taskId: 456,
      keyword: 'test',
      fileSize: 1024
    },
    createdAt: new Date().toISOString()
  };

  const mockParsedContent = {
    posts: [
      {
        id: '123456789',
        mid: '123456789',
        bid: '123456789',
        content: {
          raw: '测试微博内容 #测试# @用户',
          cleaned: '测试微博内容',
          html: '<p>测试微博内容</p>',
          hashtags: ['测试'],
          mentions: ['用户'],
          links: [],
          emojis: []
        },
        author: {
          id: '987654321',
          username: 'testuser',
          screenName: '测试用户'
        },
        metrics: {
          reposts: 10,
          comments: 25,
          likes: 100
        },
        timing: {
          createdAt: new Date(),
          createdAtStandard: new Date().toISOString(),
          relativeTime: '1小时前'
        },
        media: {
          images: [],
          videos: []
        },
        source: {
          name: 'iPhone客户端'
        },
        interaction: {
          isRepost: false
        },
        engagement: {
          isHot: false,
          isPinned: false
        },
        quality: {
          score: 0.8,
          issues: [],
          completeness: 0.9
        }
      }
    ],
    users: [
      {
        id: '987654321',
        profile: {
          username: 'testuser',
          screenName: '测试用户',
          description: '测试用户描述',
          avatar: 'http://example.com/avatar.jpg',
          avatarHd: 'http://example.com/avatar_hd.jpg'
        },
        verification: {
          isVerified: true,
          verifiedType: 0,
          verifiedReason: '知名博主',
          verificationLevel: 'yellow'
        },
        statistics: {
          followers: 10000,
          following: 500,
          posts: 1000
        },
        demographics: {
          gender: 'male',
          location: '北京'
        },
        activity: {
          status: 'active',
          accountType: 'verified',
          membershipLevel: 5
        },
        social: {
          isFollowing: false,
          isFollowed: true,
          isBlocked: false
        },
        influence: {
          influenceScore: 85,
          categories: ['verified', 'influencer']
        }
      }
    ],
    comments: [],
    media: [],
    metadata: {
      parsing: {
        timestamp: new Date(),
        version: '1.0.0',
        method: 'MediaCrawler-inspired-weibo-parser',
        sourceType: 'weibo-search-results'
      },
      quality: {
        overallScore: 0.8,
        completeness: 0.9,
        freshness: 0.95,
        reliability: 0.85
      },
      statistics: {
        totalPosts: 1,
        totalUsers: 1,
        totalComments: 0,
        totalMedia: 0,
        processingTime: 100
      },
      filters: {
        searchType: 'default',
        keywords: ['test'],
        contentType: ['post', 'user']
      }
    }
  };

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
      child: jest.fn()
    } as any;

    mockContentParser = {
      parseWeiboContent: jest.fn().mockResolvedValue(mockParsedContent)
    } as any;

    mockRawDataService = {
      create: jest.fn(),
      findBySourceUrl: jest.fn(),
      findByMetadata: jest.fn(),
      findByTaskId: jest.fn(),
      findByKeywordAndTimeRange: jest.fn(),
      updateStatus: jest.fn(),
      getStatistics: jest.fn(),
      cleanupOldData: jest.fn(),
      searchContent: jest.fn(),
      getStoragePerformanceReport: jest.fn(),
      monitorStorageHealth: jest.fn(),
      getStorageOptimizationMetrics: jest.fn(),
      executeDataLifecycleManagement: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboDataCleaner,
        {
          provide: Logger,
          useValue: mockLogger
        },
        {
          provide: WeiboContentParser,
          useValue: mockContentParser
        },
        {
          provide: RawDataService,
          useValue: mockRawDataService
        },
        {
          provide: 'RABBITMQ_CONFIG',
          useValue: { url: 'amqp://localhost:5672' }
        }
      ]
    }).compile();

    cleaner = module.get<WeiboDataCleaner>(WeiboDataCleaner);
  });

  describe('handleWeiboDataReady - 完整的数据清洗流程', () => {
    it('应该成功处理微博数据就绪事件', async () => {
      // Mock RawDataService返回数据
      const mockRawData = {
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      };
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue(mockRawData);

      const result = await cleaner.handleWeiboDataReady(mockRawDataEvent);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.quality.averageScore).toBe(0.8);
      expect(result.performance.processingTime).toBeGreaterThan(0);

      expect(mockContentParser.parseWeiboContent).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          extractFullContent: true,
          includeMediaAnalysis: true,
          calculateQualityScores: true
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('微博数据清洗艺术品创作完成'),
        expect.any(Object),
        'WeiboDataCleaner'
      );
    });

    it('应该处理非微博数据类型并跳过', async () => {
      const nonWeiboEvent: RawDataReadyEvent = {
        ...mockRawDataEvent,
        sourceType: 'twitter_search',
        sourcePlatform: SourcePlatform.CUSTOM
      };

      await expect(cleaner.handleWeiboDataReady(nonWeiboEvent))
        .rejects
        .toThrow('数据验证失败: 非微博数据类型');

      expect(mockContentParser.parseWeiboContent).not.toHaveBeenCalled();
    });

    it('应该处理原始数据获取失败的情况', async () => {
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue(null);

      await expect(cleaner.handleWeiboDataReady(mockRawDataEvent))
        .rejects
        .toThrow('原始数据不存在: test_raw_data_123');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理解析过程中的错误', async () => {
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: 'invalid json'
      });

      mockContentParser.parseWeiboContent = jest.fn().mockRejectedValue(
        new Error('JSON解析失败')
      );

      await expect(cleaner.handleWeiboDataReady(mockRawDataEvent))
        .rejects
        .toThrow('微博数据清洗失败: JSON解析失败');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('微博数据清洗艺术品创作失败'),
        expect.objectContaining({
          error: 'JSON解析失败',
          errorType: expect.any(String)
        }),
        'WeiboDataCleaner'
      );
    });
  });

  describe('batchCleanWeiboData - 批量数据清洗', () => {
    it('应该成功处理批量数据清洗', async () => {
      const rawDataIds = ['data1', 'data2', 'data3'];

      // Mock多个原始数据
      mockRawDataService.findBySourceUrl = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          rawContent: JSON.stringify(mockRawDataEvent),
          metadata: mockRawDataEvent.metadata
        });
      });

      const results = await cleaner.batchCleanWeiboData(rawDataIds);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockContentParser.parseWeiboContent).toHaveBeenCalledTimes(3);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('批量微博数据清洗完成'),
        expect.objectContaining({
          totalItems: 3,
          successCount: 3,
          failureCount: 0
        }),
        'WeiboDataCleaner'
      );
    });

    it('应该分批处理大量数据', async () => {
      const rawDataIds = Array.from({ length: 150 }, (_, i) => `data${i}`);
      const options = { maxBatchSize: 50 };

      mockRawDataService.findBySourceUrl = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          rawContent: JSON.stringify(mockRawDataEvent),
          metadata: mockRawDataEvent.metadata
        });
      });

      const results = await cleaner.batchCleanWeiboData(rawDataIds, options);

      expect(results).toHaveLength(150);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('处理批次 1/3'),
        expect.any(Object),
        'WeiboDataCleaner'
      );
    });

    it('应该处理批次中的部分失败', async () => {
      const rawDataIds = ['data1', 'data2', 'data3'];

      mockRawDataService.findBySourceUrl = jest.fn().mockImplementation((id) => {
        if (id === 'data2') {
          return Promise.resolve(null); // 模拟数据不存在
        }
        return Promise.resolve({
          _id: id,
          rawContent: JSON.stringify(mockRawDataEvent),
          metadata: mockRawDataEvent.metadata
        });
      });

      const results = await cleaner.batchCleanWeiboData(rawDataIds);

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });
  });

  describe('数据质量验证', () => {
    it('应该验证低质量数据并发出警告', async () => {
      const lowQualityContent = {
        ...mockParsedContent,
        posts: [
          {
            ...mockParsedContent.posts[0],
            quality: {
              score: 0.2,
              issues: ['内容过短', '缺乏互动'],
              completeness: 0.3
            }
          }
        ]
      };

      mockContentParser.parseWeiboContent = jest.fn().mockResolvedValue(lowQualityContent);
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      const result = await cleaner.handleWeiboDataReady(mockRawDataEvent);

      expect(result.success).toBe(true);
      expect(result.quality.averageScore).toBe(0.2);
      expect(result.quality.lowQualityCount).toBe(1);
    });

    it('应该处理验证失败的情况', async () => {
      const invalidContent = {
        ...mockParsedContent,
        posts: [] // 空帖子列表
      };

      mockContentParser.parseWeiboContent = jest.fn().mockResolvedValue(invalidContent);
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      await expect(cleaner.handleWeiboDataReady(mockRawDataEvent))
        .rejects
        .toThrow('数据验证失败: 缺少微博帖子数据');
    });
  });

  describe('性能监控', () => {
    it('应该监控处理性能并记录指标', async () => {
      const startTime = Date.now();

      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      const result = await cleaner.handleWeiboDataReady(mockRawDataEvent);

      expect(result.performance.processingTime).toBeGreaterThan(0);
      expect(result.performance.averageProcessingTime).toBeGreaterThan(0);
      expect(result.performance.throughput).toBeGreaterThan(0);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('微博数据清洗艺术品创作完成'),
        expect.objectContaining({
          throughput: expect.any(Number)
        }),
        'WeiboDataCleaner'
      );
    });

    it('应该记录详细的性能指标', async () => {
      const rawDataIds = Array.from({ length: 10 }, (_, i) => `data${i}`);

      mockRawDataService.findBySourceUrl = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          rawContent: JSON.stringify(mockRawDataEvent),
          metadata: mockRawDataEvent.metadata
        });
      });

      const results = await cleaner.batchCleanWeiboData(rawDataIds);

      const totalThroughput = results.reduce((sum, r) => sum + r.performance.throughput, 0);
      expect(totalThroughput).toBeGreaterThan(0);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('批量微博数据清洗完成'),
        expect.objectContaining({
          totalProcessingTime: expect.any(Number)
        }),
        'WeiboDataCleaner'
      );
    });
  });

  describe('错误分类和处理', () => {
    it('应该正确分类不同类型的错误', async () => {
      const testCases = [
        {
          error: new Error('Unexpected token in JSON'),
          expectedType: 'PARSE_ERROR'
        },
        {
          error: new Error('Validation failed'),
          expectedType: 'VALIDATION_ERROR'
        },
        {
          error: new Error('Request timeout'),
          expectedType: 'TIMEOUT_ERROR'
        },
        {
          error: new Error('Duplicate key error'),
          expectedType: 'DUPLICATE_ERROR'
        }
      ];

      for (const testCase of testCases) {
        mockContentParser.parseWeiboContent = jest.fn().mockRejectedValue(testCase.error);
        mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
          _id: 'test_raw_data_123',
          rawContent: JSON.stringify(mockRawDataEvent),
          metadata: mockRawDataEvent.metadata
        });

        try {
          await cleaner.handleWeiboDataReady(mockRawDataEvent);
        } catch (error) {
          expect((error as any).errorType).toBe(testCase.expectedType);
        }
      }
    });

    it('应该增强错误信息并包含上下文', async () => {
      const originalError = new Error('原始错误信息');
      mockContentParser.parseWeiboContent = jest.fn().mockRejectedValue(originalError);
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      try {
        await cleaner.handleWeiboDataReady(mockRawDataEvent);
      } catch (error) {
        expect(error.name).toBe('EnhancedWeiboCleaningError');
        expect((error as any).cleaningId).toBeDefined();
        expect((error as any).rawDataId).toBe('test_raw_data_123');
        expect((error as any).sourceType).toBe('weibo_search');
        expect((error as any).originalError).toBe(originalError);
      }
    });
  });

  describe('元数据处理', () => {
    it('应该生成完整的清洗元数据', async () => {
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      const result = await cleaner.handleWeiboDataReady(mockRawDataEvent);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.cleaningId).toMatch(/^clean_/);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.options).toBeDefined();
    });

    it('应该包含原始事件信息在错误处理中', async () => {
      mockContentParser.parseWeiboContent = jest.fn().mockRejectedValue(new Error('测试错误'));
      mockRawDataService.findBySourceUrl = jest.fn().mockResolvedValue({
        _id: 'test_raw_data_123',
        rawContent: JSON.stringify(mockRawDataEvent),
        metadata: mockRawDataEvent.metadata
      });

      try {
        await cleaner.handleWeiboDataReady(mockRawDataEvent);
      } catch (error) {
        expect((error as any).rawDataId).toBe('test_raw_data_123');
        expect((error as any).sourceType).toBe('weibo_search');
        expect((error as any).sourcePlatform).toBe(SourcePlatform.WEIBO);
      }
    });
  });
});