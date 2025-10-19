import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

import { WeiboCrawlerIntegrationTestBase } from '../weibo-crawler-test-base';
import { WeiboSearchCrawlerService } from '../../../src/weibo/search-crawler.service';
import { WeiboDetailCrawlerService } from '../../../src/weibo/detail-crawler.service';
import { RawDataService } from '../../../src/raw-data/raw-data.service';
import { WeiboAccountService } from '../../../src/weibo/account.service';

import { WeiboAccountEntity } from '@pro/entities';
import { SourceType, WeiboSearchType } from '@pro/types';
import { TestDataGenerator } from '../weibo-crawler-test-base';

/**
 * 数据质量验证集成测试 - 数字时代的数据品质守护者
 *
 * 这个测试类验证爬取数据的质量，确保每一条数据都准确无误，
 * 每一个字段都有其存在的价值，数据之间保持严格的关联性。
 *
 * 测试覆盖：
 * - 爬取数据的准确性验证
 * - 数据完整性严格检查
 * - 数据格式标准化测试
 * - 重复数据智能检测
 * - 数据一致性交叉验证
 */
describe('DataQualityValidationTest', () => {
  let testSuite: WeiboCrawlerIntegrationTestBase;
  let searchCrawlerService: WeiboSearchCrawlerService;
  let detailCrawlerService: WeiboDetailCrawlerService;
  let rawDataService: RawDataService;
  let accountService: WeiboAccountService;
  let weiboAccountRepo: Repository<WeiboAccountEntity>;

  beforeAll(async () => {
    testSuite = new WeiboCrawlerIntegrationTestBase();
    await testSuite.createTestingModule();

    searchCrawlerService = testSuite['searchCrawlerService'];
    detailCrawlerService = testSuite['detailCrawlerService'];
    rawDataService = testSuite['rawDataService'];
    accountService = testSuite['accountService'];
    weiboAccountRepo = testSuite['weiboAccountRepo'];

    await testSuite.setupTestAccounts();
  });

  afterAll(async () => {
    await testSuite.cleanupTestingModule();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('爬取数据准确性验证', () => {
    it('应该验证微博ID格式的准确性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '准确性测试',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        // 验证微博ID格式
        expect(result.id).toMatch(/^M_\d+_[a-zA-Z0-9]+$/);
        expect(result.id.length).toBeGreaterThan(10);
        expect(result.id.length).toBeLessThan(50);
      });
    });

    it('应该验证时间戳的准确性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '时间验证',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      results.forEach(result => {
        expect(result.publishTime).toBeInstanceOf(Date);
        expect(result.publishTime.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(result.publishTime.getTime()).toBeGreaterThan(oneYearAgo.getTime());

        // 验证时间的合理性
        expect(result.publishTime.getFullYear()).toBeGreaterThanOrEqual(2020);
        expect(result.publishTime.getFullYear()).toBeLessThanOrEqual(now.getFullYear() + 1);
      });
    });

    it('应该验证用户信息的准确性', async () => {
      const userId = '1234567890';
      const mockPage = testSuite['mockPage'];

      const userHtml = `
        <html>
          <body>
            <div class="WB_info">
              <div class="WB_name">准确性测试用户</div>
              <div class="WB_uid">${userId}</div>
              <div class="WB_intro">这是用户的个人简介</div>
              <div class="WB_data">
                <div class="WB_data_num">1000</div>
                <div class="WB_data_text">关注</div>
                <div class="WB_data_num">5000</div>
                <div class="WB_data_text">粉丝</div>
                <div class="WB_data_num">200</div>
                <div class="WB_data_text">微博</div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(userHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const userInfo = await detailCrawlerService.crawlUserInfo(userId);

      expect(userInfo).toBeDefined();
      expect(userInfo.userId).toBe(userId);
      expect(userInfo.nickname).toBe('准确性测试用户');
      expect(userInfo.description).toBe('这是用户的个人简介');

      // 验证数字字段的准确性
      expect(typeof userInfo.followingCount).toBe('number');
      expect(typeof userInfo.followersCount).toBe('number');
      expect(typeof userInfo.weiboCount).toBe('number');

      expect(userInfo.followingCount).toBe(1000);
      expect(userInfo.followersCount).toBe(5000);
      expect(userInfo.weiboCount).toBe(200);
    });

    it('应该验证数值数据的准确性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '数值验证',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      results.forEach(result => {
        // 验证互动数据都是非负数
        expect(typeof result.likeCount).toBe('number');
        expect(typeof result.repostCount).toBe('number');
        expect(typeof result.commentCount).toBe('number');

        expect(result.likeCount).toBeGreaterThanOrEqual(0);
        expect(result.repostCount).toBeGreaterThanOrEqual(0);
        expect(result.commentCount).toBeGreaterThanOrEqual(0);

        // 验证数值的合理性
        expect(result.likeCount).toBeLessThan(1000000); // 不超过100万
        expect(result.repostCount).toBeLessThan(1000000);
        expect(result.commentCount).toBeLessThan(1000000);

        // 验证整数
        expect(Number.isInteger(result.likeCount)).toBe(true);
        expect(Number.isInteger(result.repostCount)).toBe(true);
        expect(Number.isInteger(result.commentCount)).toBe(true);
      });
    });

    it('应该验证URL格式的准确性', async () => {
      const noteId = 'M_url_validation_123';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();

      if (expectedDetail.images.length > 0) {
        detail.images.forEach(imageUrl => {
          expect(typeof imageUrl).toBe('string');
          expect(imageUrl).toMatch(/^https?:\/\/.+/);
          expect(imageUrl.length).toBeGreaterThan(10);
          expect(imageUrl.length).toBeLessThan(500);
        });
      }

      if (expectedDetail.videos.length > 0) {
        detail.videos.forEach(video => {
          expect(video.url).toMatch(/^https?:\/\/.+/);
          expect(video.thumbnailUrl).toMatch(/^https?:\/\/.+/);

          expect(typeof video.duration).toBe('number');
          expect(typeof video.width).toBe('number');
          expect(typeof video.height).toBe('number');
          expect(typeof video.size).toBe('number');

          expect(video.duration).toBeGreaterThan(0);
          expect(video.width).toBeGreaterThan(0);
          expect(video.height).toBeGreaterThan(0);
          expect(video.size).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('数据完整性检查', () => {
    it('应该验证必要字段的存在性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '完整性测试',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      const requiredFields = ['id', 'content', 'authorId', 'authorName', 'publishTime', 'likeCount', 'repostCount', 'commentCount'];

      results.forEach(result => {
        requiredFields.forEach(field => {
          expect(result).toHaveProperty(field);
          expect(result[field]).not.toBeNull();
          expect(result[field]).not.toBeUndefined();
        });

        // 内容字段的特殊检查
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content.length).toBeLessThan(10000);
        expect(result.authorName.length).toBeGreaterThan(0);
        expect(result.authorName.length).toBeLessThan(100);
      });
    });

    it('应该验证可选字段的合理性', async () => {
      const noteId = 'M_optional_fields_456';
      const mockPage = testSuite['mockPage'];

      const htmlWithOptionalFields = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1234567890">测试用户</a></div>
              <div class="WB_text">包含可选字段的微博 #人工智能# @开发者</div>
              <div class="WB_from">
                <a date="1695123456789">3分钟前</a>
                <span class="W_icon_bicon">北京市</span>
              </div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
              <div class="WB_pic">
                <img src="https://wx1.sinaimg.cn/mw2000/test1.jpg" />
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(htmlWithOptionalFields);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();

      // 验证可选字段如果存在则格式正确
      if (detail.topics) {
        expect(Array.isArray(detail.topics)).toBe(true);
        detail.topics.forEach(topic => {
          expect(typeof topic).toBe('string');
          expect(topic).toMatch(/^#.+#$/);
        });
      }

      if (detail.mentions) {
        expect(Array.isArray(detail.mentions)).toBe(true);
        detail.mentions.forEach(mention => {
          expect(typeof mention).toBe('string');
          expect(mention).toMatch(/^@.+$/);
        });
      }

      if (detail.location) {
        expect(detail.location).toHaveProperty('name');
        expect(detail.location).toHaveProperty('address');
        expect(typeof detail.location.name).toBe('string');
        expect(typeof detail.location.address).toBe('string');
      }

      if (detail.images) {
        expect(Array.isArray(detail.images)).toBe(true);
        expect(detail.images.length).toBeGreaterThan(0);
      }
    });

    it('应该验证数据的关联完整性', async () => {
      const noteId = 'M_relation_integrity_789';
      const authorId = '1234567890';
      const mockPage = testSuite['mockPage'];

      const relationHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=${authorId}">关联测试用户</a></div>
              <div class="WB_text">关联完整性测试</div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(relationHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.id).toBe(noteId);
      expect(detail.authorId).toBe(authorId);

      // 验证关联的用户信息
      const userInfo = await detailCrawlerService.crawlUserInfo(authorId);
      expect(userInfo).toBeDefined();
      expect(userInfo.userId).toBe(authorId);
    });

    it('应该验证数据的逻辑一致性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '逻辑一致性',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      results.forEach(result => {
        // 验证时间逻辑一致性
        const now = new Date();
        expect(result.publishTime.getTime()).toBeLessThanOrEqual(now.getTime());

        // 验证数值逻辑一致性
        const totalInteractions = result.likeCount + result.repostCount + result.commentCount;
        expect(totalInteractions).toBeGreaterThanOrEqual(0);

        // 验证内容与发布时间的逻辑关系
        if (result.content.includes('刚刚') || result.content.includes('刚刚发布')) {
          const timeDiff = now.getTime() - result.publishTime.getTime();
          expect(timeDiff).toBeLessThan(5 * 60 * 1000); // 5分钟内
        }
      });
    });
  });

  describe('数据格式标准化测试', () => {
    it('应该标准化文本格式', async () => {
      const mockPage = testSuite['mockPage'];

      const unformattedHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_format_test_123">
              <div class="W_f14"><a usercard="id=1234567890">格式测试用户</a></div>
              <div class="WB_text">
                这是一条包含  多个  空格和
                换行符的微博内容
                #测试话题# @测试用户
              </div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(unformattedHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '格式测试',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        // 验证文本格式标准化
        expect(result.content).not.toMatch(/\s{2,}/); // 不应有多余空格
        expect(result.content).not.toMatch(/\n\s*\n/); // 不应有多余换行
        expect(result.content.trim()).toBe(result.content); // 不应有首尾空格

        // 验证话题和提及格式
        expect(result.topics).toBeDefined();
        expect(result.mentions).toBeDefined();

        if (result.topics.length > 0) {
          result.topics.forEach(topic => {
            expect(topic).toMatch(/^#.+#$/);
          });
        }

        if (result.mentions.length > 0) {
          result.mentions.forEach(mention => {
            expect(mention).toMatch(/^@.+$/);
          });
        }
      });
    });

    it('应该标准化时间格式', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '时间格式',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      results.forEach(result => {
        // 验证时间格式标准化
        expect(result.publishTime).toBeInstanceOf(Date);
        expect(result.publishTime.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // 验证时间戳的准确性
        expect(result.publishTime.getTime()).not.toBeNaN();
        expect(result.publishTime.getTime()).toBeGreaterThan(0);
      });
    });

    it('应该标准化URL格式', async () => {
      const noteId = 'M_url_format_456';
      const mockPage = testSuite['mockPage'];

      const urlHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1234567890">URL测试用户</a></div>
              <div class="WB_text">
                包含各种URL格式的微博
                <img src="https://wx1.sinaimg.cn/mw2000/test1.jpg?param=200x200" />
                <a href="https://weibo.com/1234567890/AbCdEfGh">链接</a>
              </div>
              <div class="WB_media_video">
                <video src="https://video.weibo.com/test.mp4?version=1.0" />
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(urlHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();

      // 验证URL格式标准化
      if (detail.images) {
        detail.images.forEach(imageUrl => {
          expect(imageUrl).toMatch(/^https?:\/\/[^\/]+\/.+/);
          // URL不应该包含多余的参数（除非必要）
          expect(imageUrl).not.toMatch(/\?[^&]*&[^&]*&/); // 不应有过多的参数
        });
      }

      if (detail.videos) {
        detail.videos.forEach(video => {
          expect(video.url).toMatch(/^https?:\/\/[^\/]+\/.+/);
          expect(video.thumbnailUrl).toMatch(/^https?:\/\/[^\/]+\/.+/);
        });
      }
    });

    it('应该标准化数字格式', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '数字格式',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      results.forEach(result => {
        // 验证数字格式标准化
        expect(typeof result.likeCount).toBe('number');
        expect(typeof result.repostCount).toBe('number');
        expect(typeof result.commentCount).toBe('number');

        // 验证数字范围
        expect(result.likeCount).toBeGreaterThanOrEqual(0);
        expect(result.repostCount).toBeGreaterThanOrEqual(0);
        expect(result.commentCount).toBeGreaterThanOrEqual(0);

        // 验证整数格式
        expect(result.likeCount).toBe(Math.floor(result.likeCount));
        expect(result.repostCount).toBe(Math.floor(result.repostCount));
        expect(result.commentCount).toBe(Math.floor(result.commentCount));
      });
    });
  });

  describe('重复数据检测', () => {
    it('应该检测到完全重复的微博', async () => {
      const noteId = 'M_duplicate_123';
      const mockPage = testSuite['mockPage'];

      const duplicateHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1234567890">重复测试用户</a></div>
              <div class="WB_text">这是一条重复的微博内容</div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
            </div>
            <div class="WB_detail" id="M_duplicate_124">
              <div class="W_f14"><a usercard="id=1234567890">重复测试用户</a></div>
              <div class="WB_text">这是一条重复的微博内容</div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(duplicateHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '重复测试',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      // Mock duplicate detection
      const duplicateGroups = await rawDataService.detectDuplicates(results);

      expect(duplicateGroups).toBeDefined();
      expect(duplicateGroups.length).toBeGreaterThanOrEqual(1);

      duplicateGroups.forEach(group => {
        expect(group.duplicates.length).toBeGreaterThan(1);
        expect(group.similarity).toBeGreaterThan(0.9);
      });
    });

    it('应该检测到内容相似的微博', async () => {
      const mockPage = testSuite['mockPage'];

      const similarHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_similar_123">
              <div class="W_f14"><a usercard="id=1234567890">相似测试用户1</a></div>
              <div class="WB_text">今天天气真好，适合出去走走</div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">50</span></div>
              </div>
            </div>
            <div class="WB_detail" id="M_similar_124">
              <div class="W_f14"><a usercard="id=1234567891">相似测试用户2</a></div>
              <div class="WB_text">今天天气真好，真的很适合出去走走</div>
              <div class="WB_from"><a date="1695123456790">5分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">45</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(similarHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '相似测试',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      // Mock similar content detection
      const similarGroups = await rawDataService.detectSimilarContent(results, { threshold: 0.8 });

      expect(similarGroups).toBeDefined();
      expect(similarGroups.length).toBeGreaterThanOrEqual(1);

      similarGroups.forEach(group => {
        expect(group.similarItems.length).toBeGreaterThan(1);
        expect(group.similarity).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该能够清理重复数据', async () => {
      const duplicateData = [
        { id: 'M_dup_1', content: '重复内容', authorId: '123', publishTime: new Date() },
        { id: 'M_dup_2', content: '重复内容', authorId: '123', publishTime: new Date() },
        { id: 'M_dup_3', content: '不同内容', authorId: '456', publishTime: new Date() }
      ];

      const cleanedData = await rawDataService.removeDuplicates(duplicateData);

      expect(cleanedData).toBeDefined();
      expect(cleanedData.length).toBeLessThan(duplicateData.length);
      expect(cleanedData.length).toBe(2); // 应该保留2条不重复的记录

      // 验证保留的是最新的记录
      const uniqueIds = new Set(cleanedData.map(item => item.content));
      expect(uniqueIds.size).toBe(cleanedData.length);
    });

    it('应该能够识别跨时间段的重复内容', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const crossTimeDuplicates = [
        { id: 'M_time_1', content: '跨时间重复内容', authorId: '123', publishTime: yesterday },
        { id: 'M_time_2', content: '跨时间重复内容', authorId: '123', publishTime: now }
      ];

      const duplicateAnalysis = await rawDataService.analyzeCrossTimeDuplicates(crossTimeDuplicates);

      expect(duplicateAnalysis).toBeDefined();
      expect(duplicateAnalysis.hasDuplicates).toBe(true);
      expect(duplicateAnalysis.timeSpan).toBeGreaterThan(0);
      expect(duplicateAnalysis.duplicateGroups.length).toBe(1);
    });
  });

  describe('数据一致性验证', () => {
    it('应该验证搜索结果与详情页的一致性', async () => {
      const keyword = '一致性测试';
      const mockPage = testSuite['mockPage'];

      // 搜索结果
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const searchData = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      // 详情页数据
      const noteId = searchData[0].id;
      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);

      const detailData = await detailCrawlerService.crawlWeiboDetail(noteId);

      // 验证一致性
      expect(searchData[0].id).toBe(detailData.id);
      expect(searchData[0].authorId).toBe(detailData.authorId);
      expect(searchData[0].authorName).toBe(detailData.authorName);
      expect(searchData[0].publishTime.getTime()).toBeCloseTo(detailData.publishTime.getTime(), -3); // 秒级精度
      expect(searchData[0].likeCount).toBe(detailData.likeCount);
      expect(searchData[0].repostCount).toBe(detailData.repostCount);
      expect(searchData[0].commentCount).toBe(detailData.commentCount);
    });

    it('应该验证用户信息的一致性', async () => {
      const userId = '1234567890';
      const mockPage = testSuite['mockPage'];

      const userHtml = `
        <html>
          <body>
            <div class="WB_info">
              <div class="WB_name">一致性测试用户</div>
              <div class="WB_uid">${userId}</div>
              <div class="WB_data">
                <div class="WB_data_num">1000</div>
                <div class="WB_data_text">关注</div>
                <div class="WB_data_num">5000</div>
                <div class="WB_data_text">粉丝</div>
                <div class="WB_data_num">200</div>
                <div class="WB_data_text">微博</div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(userHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const userInfo1 = await detailCrawlerService.crawlUserInfo(userId);
      const userInfo2 = await detailCrawlerService.crawlUserInfo(userId);

      // 验证多次获取的用户信息一致性
      expect(userInfo1.userId).toBe(userInfo2.userId);
      expect(userInfo1.nickname).toBe(userInfo2.nickname);
      expect(userInfo1.followingCount).toBe(userInfo2.followingCount);
      expect(userInfo1.followersCount).toBe(userInfo2.followersCount);
      expect(userInfo1.weiboCount).toBe(userInfo2.weiboCount);
    });

    it('应该验证数据的时间一致性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(3);

      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(searchResults[1].html)
        .mockResolvedValueOnce(searchResults[2].html);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '时间一致性',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 3
      });

      // 验证时间顺序一致性
      const sortedByTime = [...results].sort((a, b) => b.publishTime.getTime() - a.publishTime.getTime());

      results.forEach((result, index) => {
        expect(result.publishTime.getTime()).toBe(sortedByTime[index].publishTime.getTime());
      });

      // 验证时间逻辑一致性
      const now = new Date();
      results.forEach(result => {
        expect(result.publishTime.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(result.publishTime.getTime()).toBeGreaterThan(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 一年内
      });
    });

    it('应该验证数据格式的跨服务一致性', async () => {
      const noteId = 'M_cross_service_123';
      const mockPage = testSuite['mockPage'];

      const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detailData = await detailCrawlerService.crawlWeiboDetail(noteId);

      // 模拟将数据存储到不同的服务
      const storedInRawData = await rawDataService.saveRawData(detailData);
      const storedInSearchIndex = await rawDataService.saveToSearchIndex(detailData);
      const storedInCache = await rawDataService.saveToCache(detailData);

      // 验证跨服务数据一致性
      expect(storedInRawData.id).toBe(detailData.id);
      expect(storedInSearchIndex.id).toBe(detailData.id);
      expect(storedInCache.id).toBe(detailData.id);

      expect(storedInRawData.content).toBe(detailData.content);
      expect(storedInSearchIndex.content).toBe(detailData.content);
      expect(storedInCache.content).toBe(detailData.content);

      // 验证时间戳一致性
      expect(new Date(storedInRawData.timestamp).getTime()).toBeCloseTo(new Date(storedInSearchIndex.timestamp).getTime(), -3);
      expect(new Date(storedInCache.timestamp).getTime()).toBeCloseTo(new Date(storedInRawData.timestamp).getTime(), -3);
    });

    it('应该验证数据完整性的一致性', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);

      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(searchResults[1].html);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '完整性一致性',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 2
      });

      // 验证每个记录的字段完整性一致性
      const requiredFields = ['id', 'content', 'authorId', 'authorName', 'publishTime', 'likeCount', 'repostCount', 'commentCount'];

      results.forEach(result => {
        requiredFields.forEach(field => {
          expect(result).toHaveProperty(field);
          expect(result[field]).not.toBeNull();
          expect(result[field]).not.toBeUndefined();
        });
      });

      // 验证字段类型一致性
      results.forEach(result => {
        expect(typeof result.id).toBe('string');
        expect(typeof result.content).toBe('string');
        expect(typeof result.authorId).toBe('string');
        expect(typeof result.authorName).toBe('string');
        expect(result.publishTime).toBeInstanceOf(Date);
        expect(typeof result.likeCount).toBe('number');
        expect(typeof result.repostCount).toBe('number');
        expect(typeof result.commentCount).toBe('number');
      });
    });
  });

  describe('数据质量评分', () => {
    it('应该能够计算数据质量分数', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '质量评分',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      const qualityScores = await rawDataService.calculateQualityScores(results);

      expect(qualityScores).toBeDefined();
      expect(qualityScores.length).toBe(results.length);

      qualityScores.forEach(score => {
        expect(score).toHaveProperty('id');
        expect(score).toHaveProperty('overallScore');
        expect(score).toHaveProperty('completenessScore');
        expect(score).toHaveProperty('accuracyScore');
        expect(score).toHaveProperty('consistencyScore');
        expect(score).toHaveProperty('freshnessScore');

        expect(score.overallScore).toBeGreaterThanOrEqual(0);
        expect(score.overallScore).toBeLessThanOrEqual(100);

        expect(score.completenessScore).toBeGreaterThanOrEqual(0);
        expect(score.completenessScore).toBeLessThanOrEqual(100);

        expect(score.accuracyScore).toBeGreaterThanOrEqual(0);
        expect(score.accuracyScore).toBeLessThanOrEqual(100);

        expect(score.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(score.consistencyScore).toBeLessThanOrEqual(100);

        expect(score.freshnessScore).toBeGreaterThanOrEqual(0);
        expect(score.freshnessScore).toBeLessThanOrEqual(100);
      });
    });

    it('应该能够识别低质量数据', async () => {
      const lowQualityData = [
        {
          id: 'M_low_1',
          content: '', // 空内容
          authorId: '',
          authorName: '',
          publishTime: new Date(),
          likeCount: -1, // 负数
          repostCount: NaN, // 无效数字
          commentCount: null // null值
        }
      ];

      const qualityIssues = await rawDataService.identifyQualityIssues(lowQualityData);

      expect(qualityIssues).toBeDefined();
      expect(qualityIssues.length).toBe(1);

      const issues = qualityIssues[0];
      expect(issues.issues).toContain('empty_content');
      expect(issues.issues).toContain('invalid_author');
      expect(issues.issues).toContain('invalid_count');
      expect(issues.issues).toContain('null_values');

      expect(issues.severity).toBe('high');
    });

    it('应该能够生成数据质量报告', async () => {
      const mockPage = testSuite['mockPage'];
      const searchResults = TestDataGenerator.generateWeiboSearchResult(5);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: '质量报告',
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      const qualityReport = await rawDataService.generateQualityReport(results);

      expect(qualityReport).toBeDefined();
      expect(qualityReport).toHaveProperty('totalRecords');
      expect(qualityReport).toHaveProperty('averageQualityScore');
      expect(qualityReport).toHaveProperty('highQualityCount');
      expect(qualityReport).toHaveProperty('mediumQualityCount');
      expect(qualityReport).toHaveProperty('lowQualityCount');
      expect(qualityReport).toHaveProperty('commonIssues');
      expect(qualityReport).toHaveProperty('recommendations');
      expect(qualityReport).toHaveProperty('generatedAt');

      expect(qualityReport.totalRecords).toBe(results.length);
      expect(qualityReport.averageQualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityReport.averageQualityScore).toBeLessThanOrEqual(100);
      expect(qualityReport.generatedAt).toBeInstanceOf(Date);
    });
  });
});