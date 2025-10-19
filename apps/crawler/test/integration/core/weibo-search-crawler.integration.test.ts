import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';

import { WeiboSearchCrawlerIntegrationTest } from '../weibo-crawler-test-base';
import { WeiboSearchCrawlerService } from '../../../src/weibo/search-crawler.service';
import { WeiboAccountService } from '../../../src/weibo/account.service';
import { BrowserService } from '../../../src/browser/browser.service';
import { RawDataService } from '../../../src/raw-data/raw-data.service';
import { RobotsService } from '../../../src/robots/robots.service';
import { RequestMonitorService } from '../../../src/monitoring/request-monitor.service';

import { SourceType, WeiboSearchType, WeiboCrawlMode } from '@pro/types';
import { TestDataGenerator } from '../weibo-crawler-test-base';

/**
 * 微博搜索爬取集成测试 - 数字时代的搜索艺术检验者
 *
 * 这个测试类验证微博搜索爬取的核心功能，确保每一个搜索请求都能
 * 精准地捕获到目标数据，每一个字段都有其存在的意义。
 *
 * 测试覆盖：
 * - 关键词搜索的精确性
 * - 时间范围过滤的有效性
 * - 搜索结果分页的完整性
 * - 搜索数据的结构化准确性
 * - 反爬虫机制的优雅绕过
 */
describe('WeiboSearchCrawlerIntegrationTest', () => {
  let testSuite: WeiboSearchCrawlerIntegrationTest;
  let searchCrawlerService: WeiboSearchCrawlerService;
  let accountService: WeiboAccountService;
  let browserService: BrowserService;
  let rawDataService: RawDataService;
  let robotsService: RobotsService;
  let requestMonitorService: RequestMonitorService;

  beforeAll(async () => {
    testSuite = new WeiboSearchCrawlerIntegrationTest();
    await testSuite.createTestingModule();

    searchCrawlerService = testSuite['searchCrawlerService'];
    accountService = testSuite['accountService'];
    browserService = testSuite['browserService'];
    rawDataService = testSuite['rawDataService'];
    robotsService = testSuite['robotsService'];
    requestMonitorService = testSuite['requestMonitorService'];

    await testSuite.setupTestAccounts();
  });

  afterAll(async () => {
    await testSuite.cleanupTestingModule();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('关键词搜索功能测试', () => {
    it('应该能够执行基本的关键词搜索', async () => {
      const keyword = '人工智能';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(3);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(keyword),
        expect.any(Object)
      );

      results.forEach(result => {
        expect(result.content).toContain(keyword);
        expect(result.id).toMatch(/^M_\d+_\d+_\d+$/);
        expect(result.authorName).toBeTruthy();
        expect(result.publishTime).toBeInstanceOf(Date);
        expect(result.likeCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该能够处理复杂关键词组合搜索', async () => {
      const complexKeyword = '人工智能 AND 机器学习 -深度学习';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);
      searchResults[0].html = searchResults[0].html.replace(/#测试#/g, '#人工智能# #机器学习#');
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: complexKeyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(complexKeyword)),
        expect.any(Object)
      );
    });

    it('应该能够处理无搜索结果的情况', async () => {
      const keyword = '不存在的关键词XYZ123';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue(testSuite.createMockSearchPageHtml(1, false));
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toEqual([]);
      expect(mockPage.goto).toHaveBeenCalled();
    });

    it('应该能够处理包含特殊字符的关键词', async () => {
      const specialKeyword = 'C++ & Python @开发者 #编程$%^&*()';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword: specialKeyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(specialKeyword)),
        expect.any(Object)
      );
    });
  });

  describe('时间范围过滤测试', () => {
    it('应该能够按时间范围过滤搜索结果', async () => {
      const keyword = '技术趋势';
      const startDate = new Date('2023-09-01');
      const endDate = new Date('2023-09-19');
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        startDate,
        endDate,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('starttime'),
        expect.any(Object)
      );

      results.forEach(result => {
        expect(result.publishTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(result.publishTime.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('应该能够处理最近时间的搜索', async () => {
      const keyword = '最新动态';
      const timeFilter = '1h'; // 最近1小时
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        timeFilter,
        maxPages: 1
      });

      expect(results).toBeDefined();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      results.forEach(result => {
        expect(result.publishTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
      });
    });

    it('应该能够处理跨天时间范围的搜索', async () => {
      const keyword = '夜间讨论';
      const startDate = new Date('2023-09-18T20:00:00Z');
      const endDate = new Date('2023-09-19T08:00:00Z');
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        startDate,
        endDate,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('timescope'),
        expect.any(Object)
      );
    });
  });

  describe('搜索结果分页测试', () => {
    it('应该能够正确处理多页搜索结果', async () => {
      const keyword = '热门话题';
      const maxPages = 3;
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(maxPages);

      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(searchResults[1].html)
        .mockResolvedValueOnce(searchResults[2].html);

      mockPage.waitForSelector.mockResolvedValue(true as any);
      mockPage.url.mockReturnValue(`https://weibo.com/search?q=${keyword}`);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledTimes(maxPages);
      expect(results.length).toBeGreaterThan(0);

      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(results.length); // 确保没有重复结果
    });

    it('应该能够处理最后一页无下一页的情况', async () => {
      const keyword = '历史数据';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);
      const lastPageHtml = searchResults[1].html.replace('<div class="page next">下一页</div>', '');

      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(lastPageHtml);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 5
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledTimes(2); // 只加载了两页
    });

    it('应该能够在分页过程中保持搜索参数', async () => {
      const keyword = '持续追踪';
      const startDate = new Date('2023-09-01');
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(2);

      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(searchResults[1].html);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        startDate,
        maxPages: 2
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenNthCalledWith(1,
        expect.stringContaining(keyword),
        expect.any(Object)
      );
      expect(mockPage.goto).toHaveBeenNthCalledWith(2,
        expect.stringContaining(keyword),
        expect.any(Object)
      );
    });
  });

  describe('搜索数据完整性验证', () => {
    it('应该确保所有搜索结果包含必要字段', async () => {
      const keyword = '完整性测试';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('authorId');
        expect(result).toHaveProperty('authorName');
        expect(result).toHaveProperty('publishTime');
        expect(result).toHaveProperty('likeCount');
        expect(result).toHaveProperty('repostCount');
        expect(result).toHaveProperty('commentCount');

        expect(typeof result.id).toBe('string');
        expect(typeof result.content).toBe('string');
        expect(typeof result.authorId).toBe('string');
        expect(typeof result.authorName).toBe('string');
        expect(result.publishTime).toBeInstanceOf(Date);
        expect(typeof result.likeCount).toBe('number');
        expect(typeof result.repostCount).toBe('number');
        expect(typeof result.commentCount).toBe('number');

        expect(result.id).toBeTruthy();
        expect(result.content).toBeTruthy();
        expect(result.authorName).toBeTruthy();
        expect(result.likeCount).toBeGreaterThanOrEqual(0);
        expect(result.repostCount).toBeGreaterThanOrEqual(0);
        expect(result.commentCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该能够正确解析话题标签和提及', async () => {
      const keyword = '互动测试';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      const enhancedHtml = searchResults[0].html.replace(
        /第1页第1条微博内容 #测试#/,
        '第1页第1条微博内容 #人工智能# #机器学习# @开发者 @技术大牛'
      );
      mockPage.content.mockResolvedValue(enhancedHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        expect(result.topics).toContain('人工智能');
        expect(result.topics).toContain('机器学习');
        expect(result.mentions).toContain('开发者');
        expect(result.mentions).toContain('技术大牛');
      });
    });

    it('应该能够正确处理媒体内容信息', async () => {
      const keyword = '图片分享';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult('M_test_123');
      const searchHtml = html.replace(/<div class="WB_text">.*?<\/div>/,
        `<div class="WB_text">${keyword}的图片分享</div>`);

      mockPage.content.mockResolvedValue(searchHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        if (expectedDetail.images.length > 0) {
          expect(result.images).toBeDefined();
          expect(result.images.length).toBeGreaterThan(0);
          result.images.forEach(image => {
            expect(typeof image).toBe('string');
            expect(image).toMatch(/^https?:\/\//);
          });
        }

        if (expectedDetail.videos.length > 0) {
          expect(result.videos).toBeDefined();
          expect(result.videos.length).toBeGreaterThan(0);
          result.videos.forEach(video => {
            expect(video).toHaveProperty('url');
            expect(video).toHaveProperty('thumbnailUrl');
            expect(typeof video.url).toBe('string');
            expect(typeof video.thumbnailUrl).toBe('string');
          });
        }
      });
    });
  });

  describe('反爬虫机制绕过测试', () => {
    it('应该能够处理检测到的机器人验证', async () => {
      const keyword = '验证测试';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="verify_form">请进行人机验证</div>
          </body>
        </html>
      `);

      mockPage.waitForSelector
        .mockResolvedValueOnce(false as any) // 检测到验证页面
        .mockResolvedValueOnce(true as any);  // 验证通过后

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.waitForSelector).toHaveBeenCalledTimes(2);
    });

    it('应该能够在遇到限制时自动重试', async () => {
      const keyword = '重试测试';
      const mockPage = testSuite['mockPage'];

      mockPage.goto
        .mockRejectedValueOnce(new Error('请求频率过高'))
        .mockResolvedValueOnce(undefined);

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_feed">
              <div class="WB_detail" id="M_retry_123">
                <div class="WB_text">重试成功的内容</div>
              </div>
            </div>
          </body>
        </html>
      `);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      expect(requestMonitorService.getCurrentDelay).toHaveBeenCalled();
    });

    it('应该能够模拟人类浏览行为', async () => {
      const keyword = '行为模拟';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1,
        simulateHuman: true
      });

      expect(results).toBeDefined();
      expect(requestMonitorService.waitForNextRequest).toHaveBeenCalled();
      expect(requestMonitorService.recordRequest).toHaveBeenCalled();
    });

    it('应该能够处理账号切换情况', async () => {
      const keyword = '账号切换';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_login">登录失效</div>
          </body>
        </html>
      `);

      jest.spyOn(accountService, 'switchToNextAccount').mockResolvedValue(true);

      mockPage.content
        .mockResolvedValueOnce(`
          <html>
            <body>
              <div class="WB_login">登录失效</div>
            </body>
          </html>
        `)
        .mockResolvedValueOnce(`
          <html>
            <body>
              <div class="WB_feed">
                <div class="WB_detail" id="M_switched_456">
                  <div class="WB_text">切换账号后的内容</div>
                </div>
              </div>
            </body>
          </html>
        `);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1,
        enableAccountRotation: true
      });

      expect(results).toBeDefined();
      expect(accountService.switchToNextAccount).toHaveBeenCalled();
    });
  });

  describe('性能和稳定性测试', () => {
    it('应该在合理时间内完成搜索', async () => {
      const keyword = '性能测试';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(1);
      mockPage.content.mockResolvedValue(searchResults[0].html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const startTime = Date.now();
      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });
      const endTime = Date.now();

      expect(results).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该能够处理大量搜索结果', async () => {
      const keyword = '大数据测试';
      const mockPage = testSuite['mockPage'];

      const searchResults = TestDataGenerator.generateWeiboSearchResult(3);
      mockPage.content
        .mockResolvedValueOnce(searchResults[0].html)
        .mockResolvedValueOnce(searchResults[1].html)
        .mockResolvedValueOnce(searchResults[2].html);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 3
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(20); // 至少应该有20条结果
    });

    it('应该在网络异常时优雅降级', async () => {
      const keyword = '网络异常测试';
      const mockPage = testSuite['mockPage'];

      mockPage.goto.mockRejectedValue(new Error('Network timeout'));

      const results = await searchCrawlerService.searchWeibo({
        keyword,
        searchType: WeiboSearchType.KEYWORD,
        maxPages: 1
      });

      expect(results).toBeDefined();
      // 应该返回空结果而不是抛出异常
      expect(Array.isArray(results)).toBe(true);
    });
  });
});