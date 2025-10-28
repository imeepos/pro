import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger-nestjs';
import {
  WeiboSearchCrawlerService,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult
} from '../../../src/weibo/search-crawler.service';
import { WeiboDataCleaner } from '../../../src/data-cleaner/weibo-data-cleaner.service';
import { WeiboContentParser } from '../../../src/data-cleaner/weibo-content-parser.service';
import {
  TEST_CONFIG,
  TestStateManager,
  TestUtils,
  MockWeiboAccountService,
  MockBrowserService,
  MockRawDataService,
  MockRobotsService,
  MockRequestMonitorService
} from '../setup';

/**
 * 数据一致性验证测试 - 数字时代的数据完整性艺术品
 * 验证数据的准确性、完整性、一致性和标准化程度
 */

describe('数据一致性验证测试', () => {
  let crawlerService: WeiboSearchCrawlerService;
  let dataCleaner: WeiboDataCleaner;
  let contentParser: WeiboContentParser;
  let module: TestingModule;
  let testSessionId: string;

  // 数据一致性验证器
  class DataConsistencyValidator {
    /**
     * 验证数据完整性
     */
    static validateDataIntegrity(data: any): {
      isValid: boolean;
      issues: string[];
      score: number;
    } {
      const issues: string[] = [];
      let score = 100;

      if (!data) {
        issues.push('数据为空');
        return { isValid: false, issues, score: 0 };
      }

      // 检查必要字段
      const requiredFields = ['id', 'content', 'author', 'timestamp'];
      requiredFields.forEach(field => {
        if (!data[field]) {
          issues.push(`缺少必要字段: ${field}`);
          score -= 20;
        }
      });

      // 检查数据类型
      if (data.id && typeof data.id !== 'string') {
        issues.push('ID字段类型错误');
        score -= 10;
      }

      if (data.content && typeof data.content !== 'string') {
        issues.push('内容字段类型错误');
        score -= 10;
      }

      if (data.timestamp && !(data.timestamp instanceof Date)) {
        issues.push('时间戳格式错误');
        score -= 15;
      }

      // 检查内容长度
      if (data.content && data.content.length === 0) {
        issues.push('内容为空');
        score -= 25;
      }

      if (data.content && data.content.length > 10000) {
        issues.push('内容过长，可能包含错误数据');
        score -= 15;
      }

      return {
        isValid: issues.length === 0,
        issues,
        score: Math.max(0, score)
      };
    }

    /**
     * 验证数据一致性
     */
    static validateDataConsistency(dataList: any[]): {
      isValid: boolean;
      inconsistencies: string[];
      duplicateCount: number;
      score: number;
    } {
      const inconsistencies: string[] = [];
      let score = 100;
      let duplicateCount = 0;

      if (!Array.isArray(dataList) || dataList.length === 0) {
        inconsistencies.push('数据列表为空或格式错误');
        return { isValid: false, inconsistencies, duplicateCount: 0, score: 0 };
      }

      // 检查重复数据
      const idSet = new Set();
      const contentHashes = new Set();

      dataList.forEach((data, index) => {
        // ID重复检查
        if (data.id) {
          if (idSet.has(data.id)) {
            duplicateCount++;
            inconsistencies.push(`重复ID: ${data.id} (索引: ${index})`);
            score -= 10;
          } else {
            idSet.add(data.id);
          }
        }

        // 内容重复检查
        if (data.content) {
          const contentHash = this.generateContentHash(data.content);
          if (contentHashes.has(contentHash)) {
            inconsistencies.push(`重复内容: 索引 ${index}`);
            score -= 5;
          } else {
            contentHashes.add(contentHash);
          }
        }
      });

      // 检查时间序列一致性
      const timestamps = dataList
        .filter(d => d.timestamp)
        .map(d => new Date(d.timestamp).getTime())
        .sort((a, b) => a - b);

      if (timestamps.length > 1) {
        for (let i = 1; i < timestamps.length; i++) {
          if (timestamps[i] < timestamps[i - 1]) {
            inconsistencies.push(`时间序列不一致: 索引 ${i}`);
            score -= 5;
          }
        }
      }

      // 检查数据格式一致性
      const formatChecks = {
        id: dataList.every(d => !d.id || typeof d.id === 'string'),
        content: dataList.every(d => !d.content || typeof d.content === 'string'),
        author: dataList.every(d => !d.author || typeof d.author === 'object'),
        timestamp: dataList.every(d => !d.timestamp || !isNaN(new Date(d.timestamp).getTime()))
      };

      Object.entries(formatChecks).forEach(([field, isConsistent]) => {
        if (!isConsistent) {
          inconsistencies.push(`${field}字段格式不一致`);
          score -= 10;
        }
      });

      return {
        isValid: inconsistencies.length === 0,
        inconsistencies,
        duplicateCount,
        score: Math.max(0, score)
      };
    }

    /**
     * 验证数据标准化程度
     */
    static validateDataStandardization(data: any): {
      isValid: boolean;
      standardizationIssues: string[];
      score: number;
      standardizedFields: string[];
    } {
      const issues: string[] = [];
      let score = 100;
      const standardizedFields: string[] = [];

      if (!data) {
        return { isValid: false, standardizationIssues: ['数据为空'], score: 0, standardizedFields: [] };
      }

      // 检查时间格式标准化
      if (data.timestamp) {
        const timestamp = new Date(data.timestamp);
        if (!isNaN(timestamp.getTime()) && timestamp.toISOString() === data.timestamp) {
          standardizedFields.push('timestamp');
        } else {
          issues.push('时间戳格式不标准');
          score -= 15;
        }
      }

      // 检查内容标准化
      if (data.content) {
        const isStandardized = this.validateContentStandardization(data.content);
        if (isStandardized) {
          standardizedFields.push('content');
        } else {
          issues.push('内容格式不标准');
          score -= 10;
        }
      }

      // 检查用户信息标准化
      if (data.author) {
        const authorFields = ['id', 'name', 'avatar'];
        const hasAllFields = authorFields.every(field => data.author[field]);
        if (hasAllFields) {
          standardizedFields.push('author');
        } else {
          issues.push('作者信息不完整');
          score -= 10;
        }
      }

      // 检查媒体信息标准化
      if (data.media && Array.isArray(data.media)) {
        const standardizedMedia = data.media.every((item: any) => {
          return item.url && item.type && ['image', 'video'].includes(item.type);
        });

        if (standardizedMedia) {
          standardizedFields.push('media');
        } else {
          issues.push('媒体信息格式不标准');
          score -= 10;
        }
      }

      // 检查指标数据标准化
      if (data.metrics) {
        const requiredMetrics = ['likes', 'comments', 'reposts'];
        const hasAllMetrics = requiredMetrics.every(metric =>
          typeof data.metrics[metric] === 'number' && data.metrics[metric] >= 0
        );

        if (hasAllMetrics) {
          standardizedFields.push('metrics');
        } else {
          issues.push('指标数据不标准');
          score -= 10;
        }
      }

      return {
        isValid: issues.length === 0,
        standardizationIssues: issues,
        score: Math.max(0, score),
        standardizedFields
      };
    }

    /**
     * 验证增量数据正确性
     */
    static validateIncrementalData(
      existingData: any[],
      newData: any[]
    ): {
      isValid: boolean;
      issues: string[];
      newItemsCount: number;
      duplicateNewItems: number;
      score: number;
    } {
      const issues: string[] = [];
      let score = 100;
      let newItemsCount = 0;
      let duplicateNewItems = 0;

      const existingIds = new Set(existingData.map(d => d.id).filter(Boolean));
      const newIds = new Set();

      newData.forEach((item, index) => {
        if (!item.id) {
          issues.push(`新数据缺少ID: 索引 ${index}`);
          score -= 20;
          return;
        }

        if (existingIds.has(item.id)) {
          duplicateNewItems++;
          issues.push(`新数据与现有数据重复: ${item.id}`);
          score -= 10;
        } else if (newIds.has(item.id)) {
          duplicateNewItems++;
          issues.push(`新数据内部重复: ${item.id}`);
          score -= 5;
        } else {
          newIds.add(item.id);
          newItemsCount++;
        }
      });

      // 检查增量数据的时间范围
      if (existingData.length > 0 && newData.length > 0) {
        const existingTimeRange = {
          start: Math.min(...existingData.map(d => new Date(d.timestamp).getTime()).filter(t => !isNaN(t))),
          end: Math.max(...existingData.map(d => new Date(d.timestamp).getTime()).filter(t => !isNaN(t)))
        };

        const newTimeRange = {
          start: Math.min(...newData.map(d => new Date(d.timestamp).getTime()).filter(t => !isNaN(t))),
          end: Math.max(...newData.map(d => new Date(d.timestamp).getTime()).filter(t => !isNaN(t)))
        };

        // 增量数据应该主要在现有数据之后
        if (newTimeRange.start < existingTimeRange.start) {
          issues.push('增量数据包含过旧的内容');
          score -= 15;
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        newItemsCount,
        duplicateNewItems,
        score: Math.max(0, score)
      };
    }

    private static generateContentHash(content: string): string {
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    }

    private static validateContentStandardization(content: string): boolean {
      if (!content || typeof content !== 'string') return false;

      // 检查内容长度合理性
      if (content.length === 0 || content.length > 10000) return false;

      // 检查是否包含特殊字符过多（可能是错误数据）
      const specialCharCount = (content.match(/[^\w\s\u4e00-\u9fff.,!?;:()""''\n\r\t]/g) || []).length;
      const specialCharRatio = specialCharCount / content.length;

      if (specialCharRatio > 0.3) return false;

      // 检查是否为纯空白字符
      if (content.trim().length === 0) return false;

      return true;
    }
  }

  beforeAll(async () => {
    testSessionId = TestStateManager.getInstance().createTestSession('数据一致性验证测试');

    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            NODE_ENV: 'test',
            CRAWLER_CONFIG: {
              maxPages: 5,
              requestDelay: { min: 100, max: 300 }
            }
          })]
        })
      ],
      providers: [
        Logger,
        WeiboContentParser,
        WeiboDataCleaner,
        {
          provide: WeiboSearchCrawlerService,
          useFactory: () => ({
            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              await TestUtils.sleep(1000 + Math.random() * 2000);

              // 生成模拟数据
              const mockData = generateConsistentMockData(message.keyword, Math.floor(Math.random() * 10) + 5);

              return {
                searchResult: {
                  success: true,
                  pageCount: Math.floor(Math.random() * 5) + 1
                },
                noteDetails: mockData,
                creatorDetails: [],
                comments: [],
                mediaDownloads: [],
                crawlMetrics: {
                  totalPages: Math.floor(Math.random() * 5) + 1,
                  successfulPages: Math.floor(Math.random() * 5) + 1,
                  failedPages: 0,
                  skippedPages: 0,
                  totalRequests: Math.floor(Math.random() * 15) + 5,
                  averagePageLoadTime: 1000 + Math.random() * 1000,
                  totalDataSize: Math.floor(Math.random() * 2 * 1024 * 1024),
                  notesCrawled: mockData.length,
                  detailsCrawled: 0,
                  creatorsCrawled: 0,
                  commentsCrawled: 0,
                  mediaFilesDownloaded: 0,
                  commentDepthReached: 0,
                  totalDuration: 3000,
                  throughputMBps: Math.random() * 2 + 0.5,
                  requestsPerSecond: Math.random() * 3 + 1,
                  errorRate: 0,
                  memoryUsage: Math.floor(Math.random() * 80 + 40),
                  cpuUsage: Math.floor(Math.random() * 50 + 30)
                }
              };
            })
          })
        }
      ]
    }).compile();

    crawlerService = module.get(WeiboSearchCrawlerService);
    dataCleaner = module.get(WeiboDataCleaner);
    contentParser = module.get(WeiboContentParser);
  });

  afterAll(async () => {
    TestStateManager.getInstance().endTestSession(testSessionId);
    await module.close();
  });

  // 生成一致性模拟数据
  function generateConsistentMockData(keyword: string, count: number): any[] {
    const data: any[] = [];
    const baseTime = new Date('2024-01-01T00:00:00Z');

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 3600000); // 每小时一条

      data.push({
        id: `mock_${keyword}_${i}_${Date.now()}`,
        content: `关于${keyword}的测试内容 ${i + 1}。这是一条标准化的测试内容，包含相关的讨论和信息。`,
        author: {
          id: `user_${i % 5}`,
          name: `测试用户${i % 5 + 1}`,
          avatar: `https://example.com/avatar_${i % 5}.jpg`,
          verified: i % 3 === 0,
          followerCount: Math.floor(Math.random() * 10000) + 100
        },
        timestamp: timestamp.toISOString(),
        metrics: {
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          reposts: Math.floor(Math.random() * 50)
        },
        media: i % 3 === 0 ? [{
          url: `https://example.com/image_${i}.jpg`,
          type: 'image',
          size: 1024 * Math.floor(Math.random() * 500 + 100)
        }] : [],
        tags: [keyword, `标签${i % 3 + 1}`, '测试'],
        location: i % 4 === 0 ? `城市${i % 4 + 1}` : null,
        source: '测试平台'
      });
    }

    return data;
  }

  describe('数据完整性验证', () => {
    it('应该验证单个数据的完整性', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '完整性测试',
        taskId: 9001,
        crawlModes: ['search']
      });

      const result = await crawlerService.multiModeCrawl(testMessage);

      expect(result.noteDetails).toBeDefined();
      expect(Array.isArray(result.noteDetails)).toBe(true);

      if (result.noteDetails.length > 0) {
        const sampleData = result.noteDetails[0];
        const validation = DataConsistencyValidator.validateDataIntegrity(sampleData);

        console.log('数据完整性验证结果:', {
          isValid: validation.isValid,
          score: validation.score,
          issues: validation.issues
        });

        expect(validation.score).toBeGreaterThan(70); // 至少70%完整性
        expect(validation.issues.length).toBeLessThan(3);
      }
    });

    it('应该验证批量数据的完整性', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '批量完整性测试',
        taskId: 9002,
        crawlModes: ['search', 'detail']
      });

      const result = await crawlerService.multiModeCrawl(testMessage);

      expect(result.noteDetails).toBeDefined();

      if (result.noteDetails.length > 0) {
        const integrityScores = result.noteDetails.map(data => {
          const validation = DataConsistencyValidator.validateDataIntegrity(data);
          return validation.score;
        });

        const averageIntegrity = integrityScores.reduce((sum, score) => sum + score, 0) / integrityScores.length;
        const minIntegrity = Math.min(...integrityScores);

        console.log('批量数据完整性统计:', {
          count: result.noteDetails.length,
          averageScore: averageIntegrity.toFixed(1),
          minScore: minIntegrity,
          scores: integrityScores
        });

        expect(averageIntegrity).toBeGreaterThan(75);
        expect(minIntegrity).toBeGreaterThan(60);
      }
    });
  });

  describe('数据一致性验证', () => {
    it('应该检测重复数据', async () => {
      // 创建包含重复数据的测试
      const duplicatedData = [
        ...generateConsistentMockData('重复测试', 5),
        ...generateConsistentMockData('重复测试', 3).map(item => ({
          ...item,
          id: item.id // 保留相同的ID制造重复
        }))
      ];

      const validation = DataConsistencyValidator.validateDataConsistency(duplicatedData);

      console.log('重复数据检测结果:', {
        isValid: validation.isValid,
        duplicateCount: validation.duplicateCount,
        inconsistencies: validation.inconsistencies,
        score: validation.score
      });

      expect(validation.duplicateCount).toBeGreaterThan(0);
      expect(validation.inconsistencies.length).toBeGreaterThan(0);
      expect(validation.isValid).toBe(false);
    });

    it('应该验证数据格式一致性', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '格式一致性测试',
        taskId: 9003,
        crawlModes: ['search', 'detail', 'creator']
      });

      const result = await crawlerService.multiModeCrawl(testMessage);

      if (result.noteDetails && result.noteDetails.length > 0) {
        const validation = DataConsistencyValidator.validateDataConsistency(result.noteDetails);

        console.log('数据格式一致性结果:', {
          isValid: validation.isValid,
          inconsistencies: validation.inconsistencies,
          duplicateCount: validation.duplicateCount,
          score: validation.score
        });

        expect(validation.score).toBeGreaterThan(80);
        expect(validation.inconsistencies.length).toBeLessThan(2);
      }
    });

    it('应该验证时间序列一致性', async () => {
      const testData = generateConsistentMockData('时间序列测试', 10);

      // 故意打乱时间序列
      const shuffledData = [...testData].sort(() => Math.random() - 0.5);

      const validation = DataConsistencyValidator.validateDataConsistency(shuffledData);

      console.log('时间序列一致性结果:', {
        isValid: validation.isValid,
        inconsistencies: validation.inconsistencies,
        score: validation.score
      });

      // 打乱的数据应该有时间序列问题
      expect(validation.inconsistencies.some(issue => issue.includes('时间序列'))).toBe(true);
    });
  });

  describe('数据标准化验证', () => {
    it('应该验证数据格式标准化', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '标准化测试',
        taskId: 9004,
        crawlModes: ['search', 'detail']
      });

      const result = await crawlerService.multiModeCrawl(testMessage);

      if (result.noteDetails && result.noteDetails.length > 0) {
        const standardizationResults = result.noteDetails.map(data =>
          DataConsistencyValidator.validateDataStandardization(data)
        );

        const avgStandardizationScore = standardizationResults.reduce((sum, result) => sum + result.score, 0) / standardizationResults.length;
        const allStandardizedFields = [...new Set(standardizationResults.flatMap(result => result.standardizedFields))];

        console.log('数据标准化结果:', {
          averageScore: avgStandardizationScore.toFixed(1),
          standardizedFields: allStandardizedFields,
          issues: standardizationResults.flatMap(result => result.standardizationIssues)
        });

        expect(avgStandardizationScore).toBeGreaterThan(70);
        expect(allStandardizedFields.length).toBeGreaterThan(2);
      }
    });

    it('应该验证时间戳标准化', async () => {
      const testData = generateConsistentMockData('时间戳标准化', 5);

      const standardizationResults = testData.map(data =>
        DataConsistencyValidator.validateDataStandardization(data)
      );

      const timestampStandardized = standardizationResults.every(result =>
        result.standardizedFields.includes('timestamp')
      );

      console.log('时间戳标准化结果:', {
        allStandardized: timestampStandardized,
        results: standardizationResults.map(r => ({
          score: r.score,
          hasTimestamp: r.standardizedFields.includes('timestamp')
        }))
      });

      expect(timestampStandardized).toBe(true);
    });

    it('应该验证内容格式标准化', async () => {
      const testContent = [
        '正常内容',
        '',
        '内容过长'.repeat(1000),
        '包含特殊字符!@#$%^&*()的内容',
        '   ',
        '标准中文内容测试'
      ];

      const standardizationResults = testContent.map((content, index) => {
        const mockData = { id: `test_${index}`, content, timestamp: new Date().toISOString() };
        return DataConsistencyValidator.validateDataStandardization(mockData);
      });

      console.log('内容标准化结果:', {
        results: standardizationResults.map((r, i) => ({
          index: i,
          score: r.score,
          issues: r.standardizationIssues,
          isContentStandardized: r.standardizedFields.includes('content')
        }))
      });

      // 正常内容应该被标准化
      expect(standardizationResults[5].standardizedFields).toContain('content');
      // 空内容和过长内容应该有问题
      expect(standardizationResults[1].score).toBeLessThan(50);
      expect(standardizationResults[2].score).toBeLessThan(50);
    });
  });

  describe('增量数据验证', () => {
    it('应该正确验证增量数据', async () => {
      const existingData = generateConsistentMockData('现有数据', 8);
      const newData = generateConsistentMockData('新增数据', 5);

      // 调整新增数据的时间戳使其更新
      newData.forEach(item => {
        const newTime = new Date(item.timestamp);
        newTime.setHours(newTime.getHours() + 24); // 延后24小时
        item.timestamp = newTime.toISOString();
      });

      const validation = DataConsistencyValidator.validateIncrementalData(existingData, newData);

      console.log('增量数据验证结果:', {
        isValid: validation.isValid,
        newItemsCount: validation.newItemsCount,
        duplicateNewItems: validation.duplicateNewItems,
        score: validation.score,
        issues: validation.issues
      });

      expect(validation.isValid).toBe(true);
      expect(validation.newItemsCount).toBe(5);
      expect(validation.duplicateNewItems).toBe(0);
      expect(validation.score).toBeGreaterThan(90);
    });

    it('应该检测增量数据中的重复项', async () => {
      const existingData = generateConsistentMockData('基础数据', 5);

      // 创建包含重复的新数据
      const newData = [
        ...generateConsistentMockData('新数据', 3),
        existingData[0], // 直接重复
        existingData[2]  // 直接重复
      ];

      const validation = DataConsistencyValidator.validateIncrementalData(existingData, newData);

      console.log('重复增量数据检测结果:', {
        isValid: validation.isValid,
        newItemsCount: validation.newItemsCount,
        duplicateNewItems: validation.duplicateNewItems,
        issues: validation.issues,
        score: validation.score
      });

      expect(validation.isValid).toBe(false);
      expect(validation.duplicateNewItems).toBeGreaterThan(0);
      expect(validation.issues.some(issue => issue.includes('重复'))).toBe(true);
    });

    it('应该验证时间序列的增量正确性', async () => {
      const existingData = generateConsistentMockData('历史数据', 6);

      // 创建时间顺序错误的增量数据
      const newData = generateConsistentMockData('错误时间数据', 3);
      newData[0].timestamp = '2023-12-01T00:00:00Z'; // 过旧的时间

      const validation = DataConsistencyValidator.validateIncrementalData(existingData, newData);

      console.log('时间序列增量验证结果:', {
        isValid: validation.isValid,
        issues: validation.issues,
        score: validation.score
      });

      expect(validation.issues.some(issue => issue.includes('过旧'))).toBe(true);
    });
  });

  describe('数据质量评估', () => {
    it('应该综合评估数据质量', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '质量评估测试',
        taskId: 9005,
        crawlModes: ['search', 'detail', 'creator']
      });

      const result = await crawlerService.multiModeCrawl(testMessage);

      if (result.noteDetails && result.noteDetails.length > 0) {
        const qualityAssessments = result.noteDetails.map(data => ({
          integrity: DataConsistencyValidator.validateDataIntegrity(data),
          standardization: DataConsistencyValidator.validateDataStandardization(data)
        }));

        const overallQuality = qualityAssessments.reduce((acc, assessment) => ({
          integrityScore: acc.integrityScore + assessment.integrity.score,
          standardizationScore: acc.standardizationScore + assessment.standardization.score,
          totalIssues: acc.totalIssues + assessment.integrity.issues.length + assessment.standardization.standardizationIssues.length
        }), { integrityScore: 0, standardizationScore: 0, totalIssues: 0 });

        const avgIntegrityScore = overallQuality.integrityScore / qualityAssessments.length;
        const avgStandardizationScore = overallQuality.standardizationScore / qualityAssessments.length;
        const overallScore = (avgIntegrityScore + avgStandardizationScore) / 2;

        console.log('数据质量综合评估:', {
          dataCount: result.noteDetails.length,
          avgIntegrityScore: avgIntegrityScore.toFixed(1),
          avgStandardizationScore: avgStandardizationScore.toFixed(1),
          overallScore: overallScore.toFixed(1),
          totalIssues: overallQuality.totalIssues
        });

        expect(overallScore).toBeGreaterThan(75);
        expect(avgIntegrityScore).toBeGreaterThan(70);
        expect(avgStandardizationScore).toBeGreaterThan(70);
      }
    });

    it('应该生成数据质量报告', async () => {
      const testData = generateConsistentMockData('质量报告测试', 15);

      // 添加一些低质量数据
      testData.push(
        { id: 'bad_1', content: '', timestamp: new Date().toISOString(), author: null },
        { id: 'bad_2', content: 'x'.repeat(15000), timestamp: 'invalid-date', author: {} }
      );

      const qualityReport = {
        totalItems: testData.length,
        integrityResults: testData.map(data => DataConsistencyValidator.validateDataIntegrity(data)),
        consistencyResult: DataConsistencyValidator.validateDataConsistency(testData),
        standardizationResults: testData.map(data => DataConsistencyValidator.validateDataStandardization(data))
      };

      const highQualityItems = qualityReport.integrityResults.filter(r => r.score > 80).length;
      const mediumQualityItems = qualityReport.integrityResults.filter(r => r.score > 60 && r.score <= 80).length;
      const lowQualityItems = qualityReport.integrityResults.filter(r => r.score <= 60).length;

      console.log('数据质量报告:', {
        总数据量: qualityReport.totalItems,
        高质量数据: highQualityItems,
        中等质量数据: mediumQualityItems,
        低质量数据: lowQualityItems,
        数据一致性: {
          重复数量: qualityReport.consistencyResult.duplicateCount,
          一致性问题: qualityReport.consistencyResult.inconsistencies.length,
          一致性得分: qualityReport.consistencyResult.score
        },
        平均标准化得分: (qualityReport.standardizationResults.reduce((sum, r) => sum + r.score, 0) / qualityReport.standardizationResults.length).toFixed(1)
      });

      expect(highQualityItems + mediumQualityItems).toBeGreaterThan(lowQualityItems);
      expect(qualityReport.consistencyResult.score).toBeGreaterThan(60);
    });
  });
});