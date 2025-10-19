import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';

import { WeiboCrawlerIntegrationTestBase, TestDataGenerator } from './weibo-crawler-test-base';
import { WeiboSearchCrawlerService } from '../../src/weibo/search-crawler.service';
import { WeiboDetailCrawlerService, WeiboNoteDetail } from '../../src/weibo/detail-crawler.service';
import { RawDataService } from '../../src/raw-data/raw-data.service';
import { SourceType } from '@pro/types';

/**
 * 数据验证集成测试 - 数字时代的数据质量保证艺术品
 * 验证爬取数据的格式、质量、完整性和一致性
 */
describe('DataValidationIntegrationTest', () => {
  let testBase: WeiboCrawlerIntegrationTestBase;
  let searchCrawlerService: WeiboSearchCrawlerService;
  let detailCrawlerService: WeiboDetailCrawlerService;
  let rawDataService: RawDataService;
  let logger: Logger;

  beforeEach(async () => {
    testBase = new WeiboCrawlerIntegrationTestBase();
    await testBase.createTestingModule();

    searchCrawlerService = testBase['searchCrawlerService'];
    detailCrawlerService = testBase['detailCrawlerService'];
    rawDataService = testBase['rawDataService'];
    logger = testBase['module'].get(Logger);

    await testBase.setupTestAccounts();
  });

  afterEach(async () => {
    await testBase.cleanupTestingModule();
  });

  describe('爬取数据格式验证', () => {
    it('应该验证搜索爬取数据的基本格式', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);

      const mockPage = testBase['mockPage'] as any;
      mockPage.goto.mockImplementation(async (url: string) => {
        const pageMatch = url.match(/page=(\d+)/);
        const pageNum = pageMatch ? parseInt(pageMatch[1]) : 1;

        if (pageNum <= searchResults.length) {
          mockPage.content.mockResolvedValue(searchResults[pageNum - 1].html);
          mockPage.waitForSelector.mockResolvedValue();
        }
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);

      // 验证每个保存的数据记录格式
      expect(createSpy).toHaveBeenCalledTimes(2);
      for (let i = 0; i < 2; i++) {
        const call = createSpy.mock.calls[i];
        const savedData = call[0];

        // 验证必要字段
        expect(savedData).toHaveProperty('id');
        expect(savedData).toHaveProperty('sourceType');
        expect(savedData).toHaveProperty('sourceUrl');
        expect(savedData).toHaveProperty('rawContent');
        expect(savedData).toHaveProperty('metadata');
        expect(savedData).toHaveProperty('createdAt');

        // 验证字段类型
        expect(typeof savedData.id).toBe('number');
        expect(typeof savedData.sourceType).toBe('string');
        expect(typeof savedData.sourceUrl).toBe('string');
        expect(typeof savedData.rawContent).toBe('string');
        expect(typeof savedData.metadata).toBe('object');
        expect(savedData.createdAt).toBeInstanceOf(Date);

        // 验证枚举值
        expect(Object.values(SourceType)).toContain(savedData.sourceType);
        expect(savedData.sourceType).toBe(SourceType.WEIBO_KEYWORD_SEARCH);

        // 验证URL格式
        expect(savedData.sourceUrl).toMatch(/^https?:\/\/.+/);
        expect(savedData.sourceUrl).toContain('weibo.com');

        // 验证HTML内容
        expect(savedData.rawContent).toMatch(/^<html>.*<\/html>$/s);
        expect(savedData.rawContent).toContain('<body>');
        expect(savedData.rawContent).toContain('</body>');

        // 验证元数据结构
        expect(savedData.metadata).toHaveProperty('keyword');
        expect(savedData.metadata).toHaveProperty('taskId');
        expect(savedData.metadata).toHaveProperty('page');
        expect(savedData.metadata).toHaveProperty('accountId');
        expect(savedData.metadata).toHaveProperty('crawledAt');
        expect(savedData.metadata).toHaveProperty('traceId');

        expect(typeof savedData.metadata.keyword).toBe('string');
        expect(typeof savedData.metadata.taskId).toBe('number');
        expect(typeof savedData.metadata.page).toBe('number');
        expect(typeof savedData.metadata.accountId).toBe('number');
        expect(savedData.metadata.crawledAt).toBeInstanceOf(Date);
        expect(savedData.metadata.traceId).toMatch(/^trace_\w+_\w+$/);
      }
    });

    it('应该验证详情爬取数据的完整格式', async () => {
      const noteId = 'format_validation_note';
      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);

      const mockPage = testBase['mockPage'] as any;
      mockPage.goto.mockImplementation(async (url: string) => {
        expect(url).toContain(noteId);
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const detail = await detailCrawlerService.getNoteDetailById(noteId);

      expect(detail).not.toBeNull();

      // 验证WeiboNoteDetail接口的所有字段
      expect(detail).toHaveProperty('id');
      expect(detail).toHaveProperty('content');
      expect(detail).toHaveProperty('authorId');
      expect(detail).toHaveProperty('authorName');
      expect(detail).toHaveProperty('authorAvatar');
      expect(detail).toHaveProperty('publishTime');
      expect(detail).toHaveProperty('likeCount');
      expect(detail).toHaveProperty('repostCount');
      expect(detail).toHaveProperty('commentCount');
      expect(detail).toHaveProperty('images');
      expect(detail).toHaveProperty('videos');
      expect(detail).toHaveProperty('topics');
      expect(detail).toHaveProperty('mentions');
      expect(detail).toHaveProperty('isOriginal');
      expect(detail).toHaveProperty('rawHtml');
      expect(detail).toHaveProperty('crawledAt');

      // 验证字段类型
      expect(typeof detail.id).toBe('string');
      expect(typeof detail.content).toBe('string');
      expect(typeof detail.authorId).toBe('string');
      expect(typeof detail.authorName).toBe('string');
      expect(typeof detail.authorAvatar).toBe('string');
      expect(detail.publishTime).toBeInstanceOf(Date);
      expect(typeof detail.likeCount).toBe('number');
      expect(typeof detail.repostCount).toBe('number');
      expect(typeof detail.commentCount).toBe('number');
      expect(Array.isArray(detail.images)).toBe(true);
      expect(Array.isArray(detail.videos)).toBe(true);
      expect(Array.isArray(detail.topics)).toBe(true);
      expect(Array.isArray(detail.mentions)).toBe(true);
      expect(typeof detail.isOriginal).toBe('boolean');
      expect(typeof detail.rawHtml).toBe('string');
      expect(detail.crawledAt).toBeInstanceOf(Date);

      // 验证数值范围
      expect(detail.likeCount).toBeGreaterThanOrEqual(0);
      expect(detail.repostCount).toBeGreaterThanOrEqual(0);
      expect(detail.commentCount).toBeGreaterThanOrEqual(0);

      // 验证数组元素类型
      detail.images.forEach(img => {
        expect(typeof img).toBe('string');
        expect(img).toMatch(/^https?:\/\/.+/);
      });

      detail.videos.forEach(video => {
        expect(video).toHaveProperty('url');
        expect(video).toHaveProperty('thumbnailUrl');
        expect(video).toHaveProperty('duration');
        expect(video).toHaveProperty('width');
        expect(video).toHaveProperty('height');
        expect(video).toHaveProperty('size');
        expect(video).toHaveProperty('format');

        expect(typeof video.url).toBe('string');
        expect(typeof video.thumbnailUrl).toBe('string');
        expect(typeof video.duration).toBe('number');
        expect(typeof video.width).toBe('number');
        expect(typeof video.height).toBe('number');
        expect(typeof video.size).toBe('number');
        expect(typeof video.format).toBe('string');

        expect(video.url).toMatch(/^https?:\/\/.+/);
        expect(video.duration).toBeGreaterThanOrEqual(0);
        expect(video.width).toBeGreaterThanOrEqual(0);
        expect(video.height).toBeGreaterThanOrEqual(0);
        expect(video.size).toBeGreaterThanOrEqual(0);
      });

      detail.topics.forEach(topic => {
        expect(typeof topic).toBe('string');
        expect(topic.trim().length).toBeGreaterThan(0);
      });

      detail.mentions.forEach(mention => {
        expect(typeof mention).toBe('string');
        expect(mention.trim().length).toBeGreaterThan(0);
      });
    });

    it('应该验证时间戳和数据一致性', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const crawlStartTime = Date.now();

      const mockPage = testBase['mockPage'] as any;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, true));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      await searchCrawlerService.crawl(mockMessage);

      const savedData = createSpy.mock.calls[0][0];

      // 验证时间戳合理性
      expect(savedData.createdAt.getTime()).toBeGreaterThanOrEqual(crawlStartTime);
      expect(savedData.metadata.crawledAt.getTime()).toBeGreaterThanOrEqual(crawlStartTime);
      expect(savedData.metadata.crawledAt.getTime()).toBeLessThanOrEqual(Date.now());

      // 验证时间戳一致性
      const timeDiff = Math.abs(savedData.createdAt.getTime() - savedData.metadata.crawledAt.getTime());
      expect(timeDiff).toBeLessThan(1000); // 1秒误差范围内
    });
  });

  describe('内容质量评估', () => {
    it('应该评估微博内容的质量指标', async () => {
      const qualityTestCases = [
        {
          name: '高质量内容',
          content: '这是一个包含丰富信息的微博内容，包含了详细的技术分析 #人工智能# #机器学习# 并且有相关的图片和视频资源 @技术专家',
          expectedQuality: 'high'
        },
        {
          name: '中等质量内容',
          content: '这是一条普通的微博内容 #日常#',
          expectedQuality: 'medium'
        },
        {
          name: '低质量内容',
          content: '123',
          expectedQuality: 'low'
        },
        {
          name: '重复内容',
          content: '重复内容重复内容重复内容重复内容',
          expectedQuality: 'low'
        },
        {
          name: '空内容',
          content: '',
          expectedQuality: 'empty'
        }
      ];

      for (const testCase of qualityTestCases) {
        const noteId = `quality_test_${testCase.name.replace(/\s+/g, '_')}`;
        const html = `
          <html>
            <body>
              <div class="WB_detail" id="M_${noteId}">
                <div class="W_f14"><a usercard="id=123">测试用户</a></div>
                <div class="WB_text">${testCase.content}</div>
                <div class="WB_from"><a date="1695123456789">2023-09-19</a></div>
              </div>
            </body>
          </html>
        `;

        const mockPage = testBase['mockPage'] as any;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const detail = await detailCrawlerService.getNoteDetailById(noteId);

        expect(detail).not.toBeNull();

        // 评估内容质量
        const qualityScore = evaluateContentQuality(detail);

        switch (testCase.expectedQuality) {
          case 'high':
            expect(qualityScore).toBeGreaterThan(70);
            break;
          case 'medium':
            expect(qualityScore).toBeGreaterThan(40);
            expect(qualityScore).toBeLessThanOrEqual(70);
            break;
          case 'low':
            expect(qualityScore).toBeGreaterThan(0);
            expect(qualityScore).toBeLessThanOrEqual(40);
            break;
          case 'empty':
            expect(qualityScore).toBe(0);
            break;
        }
      }
    });

    it('应该检测和过滤垃圾内容', async () => {
      const spamContent = [
        '点击链接领取奖品!!! http://spam-link.com',
        '加微信赚钱！！！wx:spam123',
        '重复文本重复文本重复文本重复文本重复文本',
        '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉',
        '123456789012345678901234567890'
      ];

      for (const content of spamContent) {
        const noteId = `spam_test_${Math.random().toString(36).substring(7)}`;
        const html = `
          <html>
            <body>
              <div class="WB_detail" id="M_${noteId}">
                <div class="WB_text">${content}</div>
                <div class="WB_from"><a date="1695123456789">2023-09-19</a></div>
              </div>
            </body>
          </html>
        `;

        const mockPage = testBase['mockPage'] as any;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const detail = await detailCrawlerService.getNoteDetailById(noteId);

        expect(detail).not.toBeNull();

        // 检测垃圾内容特征
        const spamScore = detectSpamContent(detail);
        expect(spamScore).toBeGreaterThan(50);
      }
    });

    it('应该评估媒体内容的质量', async () => {
      const mediaQualityTests = [
        {
          name: '高质量图片',
          images: ['https://wx1.sinaimg.cn/large/2023/0919/abc123.jpg'],
          expectedQuality: 'high'
        },
        {
          name: '低质量图片',
          images: ['https://wx1.sinaimg.cn/thumb180/abc123.jpg'],
          expectedQuality: 'low'
        },
        {
          name: '高质量视频',
          videos: [{
            url: 'https://video.weibo.com/media/play/480p/abc.mp4',
            thumbnailUrl: 'https://img.weibo.com/thumb/abc.jpg',
            duration: 120,
            width: 1280,
            height: 720,
            size: 10240000,
            format: 'mp4'
          }],
          expectedQuality: 'high'
        },
        {
          name: '低质量视频',
          videos: [{
            url: 'https://video.weibo.com/media/play/240p/abc.mp4',
            thumbnailUrl: 'https://img.weibo.com/thumb/abc.jpg',
            duration: 5,
            width: 320,
            height: 240,
            size: 100000,
            format: 'mp4'
          }],
          expectedQuality: 'low'
        }
      ];

      for (const test of mediaQualityTests) {
        const noteId = `media_quality_${test.name.replace(/\s+/g, '_')}`;
        const html = generateMediaHtml(noteId, test.images || [], test.videos || []);

        const mockPage = testBase['mockPage'] as any;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const detail = await detailCrawlerService.getNoteDetailById(noteId);

        expect(detail).not.toBeNull();

        const mediaQualityScore = evaluateMediaQuality(detail);

        switch (test.expectedQuality) {
          case 'high':
            expect(mediaQualityScore).toBeGreaterThan(70);
            break;
          case 'low':
            expect(mediaQualityScore).toBeLessThanOrEqual(50);
            break;
        }
      }
    });
  });

  describe('重复数据检测', () => {
    it('应该检测基于内容的重复数据', async () => {
      const duplicateContent = '这是一条可能重复的微博内容 #测试#';
      const noteIds = ['duplicate_1', 'duplicate_2', 'duplicate_3'];

      const savedData = [];

      for (const noteId of noteIds) {
        const html = `
          <html>
            <body>
              <div class="WB_detail" id="M_${noteId}">
                <div class="WB_text">${duplicateContent}</div>
                <div class="WB_from"><a date="1695123456789">2023-09-19</a></div>
              </div>
            </body>
          </html>
        `;

        const mockPage = testBase['mockPage'] as any;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const detail = await detailCrawlerService.getNoteDetailById(noteId);
        savedData.push(detail);
      }

      // 检测重复内容
      const contentHashes = savedData.map(detail => generateContentHash(detail.content));
      const uniqueHashes = [...new Set(contentHashes)];

      expect(contentHashes.length).toBe(3);
      expect(uniqueHashes.length).toBe(1); // 应该只有一个唯一哈希

      // 验证重复检测逻辑
      const duplicates = detectDuplicateContent(savedData);
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0].count).toBe(3);
    });

    it('应该检测基于URL的重复数据', async () => {
      const duplicateUrls = [
        'https://weibo.com/1234567890/abc123',
        'https://weibo.com/1234567890/abc123',
        'https://weibo.com/1234567890/def456'
      ];

      const urlSet = new Set(duplicateUrls);
      const uniqueUrls = [...urlSet];

      expect(duplicateUrls.length).toBe(3);
      expect(uniqueUrls.length).toBe(2);

      // 模拟URL重复检测
      const duplicateGroups = groupDuplicateUrls(duplicateUrls);
      expect(duplicateGroups).toHaveLength(2);
      expect(duplicateGroups.find(g => g.url === 'https://weibo.com/1234567890/abc123').count).toBe(2);
      expect(duplicateGroups.find(g => g.url === 'https://weibo.com/1234567890/def456').count).toBe(1);
    });

    it('应该处理近似重复内容的检测', async () => {
      const similarContent = [
        '今天是美好的一天 #生活#',
        '今天真是美好的一天 #生活#',
        '今天是很好的一天 #日常#',
        '完全不同的内容 #测试#'
      ];

      const similarityThreshold = 0.8;
      const duplicateGroups = findSimilarContent(similarContent, similarityThreshold);

      expect(duplicateGroups.length).toBeGreaterThan(0);

      // 验证相似内容被正确分组
      const lifeContentGroup = duplicateGroups.find(group =>
        group.content.includes('#生活#')
      );
      expect(lifeContentGroup).toBeDefined();
      expect(lifeContentGroup.similarContent.length).toBeGreaterThanOrEqual(2);

      // 验证不同内容不被误判为重复
      const testContentGroup = duplicateGroups.find(group =>
        group.content.includes('#测试#')
      );
      expect(testContentGroup).toBeDefined();
      expect(testContentGroup.similarContent.length).toBe(1);
    });
  });

  describe('数据完整性校验', () => {
    it('应该验证微博详情数据的完整性', async () => {
      const noteId = 'completeness_test';
      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);

      const mockPage = testBase['mockPage'] as any;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const detail = await detailCrawlerService.getNoteDetailById(noteId);

      expect(detail).not.toBeNull();

      // 执行完整性检查
      const completenessReport = validateDataCompleteness(detail);

      expect(completenessReport.overallScore).toBeGreaterThan(80);
      expect(completenessReport.issues).toHaveLength(0);
      expect(completenessReport.missingFields).toHaveLength(0);

      // 验证各个字段的完整性
      expect(completenessReport.fieldStatus.id).toBe('complete');
      expect(completenessReport.fieldStatus.content).toBe('complete');
      expect(completenessReport.fieldStatus.authorName).toBe('complete');
      expect(completenessReport.fieldStatus.publishTime).toBe('complete');
    });

    it('应该检测和报告缺失的字段', async () => {
      const noteId = 'incomplete_test';
      const incompleteHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=123"></a></div>
              <div class="WB_text"></div>
              <!-- 缺失时间、互动数据等 -->
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as any;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(incompleteHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const detail = await detailCrawlerService.getNoteDetailById(noteId);

      expect(detail).not.toBeNull();

      const completenessReport = validateDataCompleteness(detail);

      expect(completenessReport.overallScore).toBeLessThan(100);
      expect(completenessReport.issues.length).toBeGreaterThan(0);
      expect(completenessReport.missingFields.length).toBeGreaterThan(0);

      // 验证具体的缺失字段检测
      expect(completenessReport.fieldStatus.authorName).toBe('empty');
      expect(completenessReport.fieldStatus.publishTime).toBe('missing');
    });

    it('应该验证数据类型的一致性', async () => {
      const testCases = [
        {
          name: '正确的数字类型',
          data: { likeCount: 100, repostCount: 50, commentCount: 25 },
          expectedValid: true
        },
        {
          name: '字符串数字',
          data: { likeCount: '100', repostCount: '50', commentCount: '25' },
          expectedValid: false
        },
        {
          name: '负数',
          data: { likeCount: -10, repostCount: 0, commentCount: 5 },
          expectedValid: false
        },
        {
          name: '非数字',
          data: { likeCount: 'abc', repostCount: null, commentCount: undefined },
          expectedValid: false
        }
      ];

      for (const testCase of testCases) {
        const validation = validateDataTypes(testCase.data);
        expect(validation.isValid).toBe(testCase.expectedValid);

        if (!testCase.expectedValid) {
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      }
    });

    it('应该验证时间序列的一致性', async () => {
      const now = new Date();
      const timeTestCases = [
        {
          name: '有效时间序列',
          publishTime: new Date(now.getTime() - 60 * 60 * 1000), // 1小时前
          crawledAt: new Date(now.getTime() - 30 * 60 * 1000), // 30分钟前
          expectedValid: true
        },
        {
          name: '未来发布时间',
          publishTime: new Date(now.getTime() + 60 * 60 * 1000), // 1小时后
          crawledAt: new Date(now),
          expectedValid: false
        },
        {
          name: '爬取时间早于发布时间',
          publishTime: new Date(now.getTime() - 30 * 60 * 1000), // 30分钟前
          crawledAt: new Date(now.getTime() - 60 * 60 * 1000), // 1小时前
          expectedValid: false
        }
      ];

      for (const testCase of timeTestCases) {
        const validation = validateTimeSequence(testCase.publishTime, testCase.crawledAt);
        expect(validation.isValid).toBe(testCase.expectedValid);

        if (!testCase.expectedValid) {
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // 辅助方法
  function evaluateContentQuality(detail: WeiboNoteDetail): number {
    let score = 0;

    // 内容长度 (30分)
    const contentLength = detail.content.length;
    if (contentLength > 100) score += 30;
    else if (contentLength > 50) score += 20;
    else if (contentLength > 10) score += 10;
    else if (contentLength > 0) score += 5;

    // 话题标签 (20分)
    score += Math.min(detail.topics.length * 5, 20);

    // 用户提及 (15分)
    score += Math.min(detail.mentions.length * 5, 15);

    // 媒体内容 (25分)
    score += Math.min(detail.images.length * 10, 15);
    score += Math.min(detail.videos.length * 10, 10);

    // 互动数据 (10分)
    if (detail.likeCount > 100) score += 5;
    if (detail.commentCount > 50) score += 5;

    return Math.min(score, 100);
  }

  function detectSpamContent(detail: WeiboNoteDetail): number {
    let spamScore = 0;
    const content = detail.content.toLowerCase();

    // 检测垃圾关键词
    const spamKeywords = ['点击', '链接', '领取', '微信', '加群', '赚钱', '红包'];
    spamKeywords.forEach(keyword => {
      if (content.includes(keyword)) spamScore += 20;
    });

    // 检测过度重复
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      spamScore += 30;
    }

    // 检测特殊字符过度使用
    const specialChars = (content.match(/[^\w\s\u4e00-\u9fff]/g) || []).length;
    if (specialChars / content.length > 0.3) {
      spamScore += 25;
    }

    // 检测数字序列
    if (/^\d+$/.test(content)) {
      spamScore += 40;
    }

    return Math.min(spamScore, 100);
  }

  function evaluateMediaQuality(detail: WeiboNoteDetail): number {
    let score = 0;

    // 图片质量评估
    detail.images.forEach(imgUrl => {
      if (imgUrl.includes('/large/') || imgUrl.includes('/mw2000/')) {
        score += 25;
      } else if (imgUrl.includes('/mw690/')) {
        score += 15;
      } else if (imgUrl.includes('/thumb180/')) {
        score += 5;
      }
    });

    // 视频质量评估
    detail.videos.forEach(video => {
      if (video.width >= 1280 && video.height >= 720) {
        score += 30;
      } else if (video.width >= 640 && video.height >= 480) {
        score += 20;
      } else {
        score += 10;
      }

      if (video.duration > 60) score += 10;
      if (video.size > 5000000) score += 10; // 5MB以上
    });

    return Math.min(score, 100);
  }

  function generateContentHash(content: string): string {
    // 简单的哈希函数，实际应用中应使用更强的哈希算法
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  function detectDuplicateContent(details: WeiboNoteDetail[]): Array<{hash: string, count: number, noteIds: string[]}> {
    const hashGroups = {};

    details.forEach(detail => {
      const hash = generateContentHash(detail.content);
      if (!hashGroups[hash]) {
        hashGroups[hash] = { hash, count: 0, noteIds: [] };
      }
      hashGroups[hash].count++;
      hashGroups[hash].noteIds.push(detail.id);
    });

    return Object.values(hashGroups).filter(group => group.count > 1);
  }

  function groupDuplicateUrls(urls: string[]): Array<{url: string, count: number}> {
    const urlGroups = {};

    urls.forEach(url => {
      if (!urlGroups[url]) {
        urlGroups[url] = { url, count: 0 };
      }
      urlGroups[url].count++;
    });

    return Object.values(urlGroups);
  }

  function findSimilarContent(contents: string[], threshold: number): Array<{content: string, similarContent: string[]}> {
    const groups = [];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      const similarContents = [content];

      for (let j = i + 1; j < contents.length; j++) {
        const similarity = calculateSimilarity(content, contents[j]);
        if (similarity >= threshold) {
          similarContents.push(contents[j]);
        }
      }

      if (similarContents.length > 1) {
        groups.push({
          content,
          similarContent: similarContents
        });
      }
    }

    return groups;
  }

  function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function calculateEditDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  function validateDataCompleteness(detail: WeiboNoteDetail): {
    overallScore: number,
    issues: string[],
    missingFields: string[],
    fieldStatus: Record<string, string>
  } {
    const fieldStatus = {};
    const issues = [];
    const missingFields = [];
    let totalScore = 0;
    const maxScore = 100;

    // 检查必要字段
    const requiredFields = [
      { name: 'id', value: detail.id, weight: 15 },
      { name: 'content', value: detail.content, weight: 20 },
      { name: 'authorId', value: detail.authorId, weight: 10 },
      { name: 'authorName', value: detail.authorName, weight: 10 },
      { name: 'publishTime', value: detail.publishTime, weight: 15 },
      { name: 'crawledAt', value: detail.crawledAt, weight: 10 }
    ];

    requiredFields.forEach(field => {
      if (!field.value || (typeof field.value === 'string' && field.value.trim() === '')) {
        fieldStatus[field.name] = 'missing';
        issues.push(`缺少必要字段: ${field.name}`);
        missingFields.push(field.name);
      } else if (typeof field.value === 'string' && field.value.length < 2) {
        fieldStatus[field.name] = 'empty';
        issues.push(`字段内容过空: ${field.name}`);
        totalScore += field.weight * 0.5; // 部分分数
      } else {
        fieldStatus[field.name] = 'complete';
        totalScore += field.weight;
      }
    });

    // 检查可选字段
    const optionalFields = [
      { name: 'authorAvatar', value: detail.authorAvatar },
      { name: 'images', value: detail.images },
      { name: 'videos', value: detail.videos },
      { name: 'topics', value: detail.topics },
      { name: 'mentions', value: detail.mentions }
    ];

    optionalFields.forEach(field => {
      if (field.value && (Array.isArray(field.value) ? field.value.length > 0 : field.value.toString().trim() !== '')) {
        totalScore += 10;
        fieldStatus[field.name] = 'complete';
      } else {
        fieldStatus[field.name] = 'missing';
      }
    });

    // 检查数值字段的有效性
    if (detail.likeCount < 0 || detail.repostCount < 0 || detail.commentCount < 0) {
      issues.push('互动数据包含负数');
      totalScore = Math.max(0, totalScore - 10);
    }

    return {
      overallScore: Math.min(totalScore, maxScore),
      issues,
      missingFields,
      fieldStatus
    };
  }

  function validateDataTypes(data: Record<string, any>): {
    isValid: boolean,
    errors: string[]
  } {
    const errors = [];
    const numericFields = ['likeCount', 'repostCount', 'commentCount'];

    numericFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        if (typeof data[field] !== 'number' || isNaN(data[field])) {
          errors.push(`${field} 应该是数字类型，实际类型: ${typeof data[field]}`);
        } else if (data[field] < 0) {
          errors.push(`${field} 不应该是负数: ${data[field]}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  function validateTimeSequence(publishTime: Date, crawledAt: Date): {
    isValid: boolean,
    errors: string[]
  } {
    const errors = [];
    const now = new Date();

    if (publishTime > now) {
      errors.push('发布时间不能是未来时间');
    }

    if (crawledAt > now) {
      errors.push('爬取时间不能是未来时间');
    }

    if (crawledAt < publishTime) {
      errors.push('爬取时间不能早于发布时间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  function generateMediaHtml(noteId: string, images: string[], videos: any[]): string {
    let html = `
      <html>
        <body>
          <div class="WB_detail" id="M_${noteId}">
            <div class="WB_text">包含媒体内容的微博</div>
    `;

    if (images.length > 0) {
      html += '<div class="WB_pic">';
      images.forEach(img => {
        html += `<img src="${img}" />`;
      });
      html += '</div>';
    }

    if (videos.length > 0) {
      html += '<div class="WB_media_video">';
      videos.forEach(video => {
        html += `
          <video>
            <source src="${video.url}" type="video/${video.format}">
          </video>
          <img src="${video.thumbnailUrl}" />
        `;
      });
      html += '</div>';
    }

    html += `
          </div>
        </body>
      </html>
    `;

    return html;
  }
});