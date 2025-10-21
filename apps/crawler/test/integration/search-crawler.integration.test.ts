import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Page } from 'playwright';

import { WeiboCrawlerIntegrationTestBase, TestDataGenerator } from './weibo-crawler-test-base';
import { WeiboSearchCrawlerService } from '../../src/weibo/search-crawler.service';
import { WeiboAccountService } from '../../src/weibo/account.service';
import { RawDataService } from '../../src/raw-data/raw-data.service';
import {
  SourceType,
  QUEUE_NAMES,
  TaskPriority,
  type WeiboDetailCrawlEvent
} from '@pro/types';

class SearchCrawlerTestHarness extends WeiboCrawlerIntegrationTestBase {
  public async init(): Promise<void> {
    await this.createTestingModule();
  }

  public getSearchService(): WeiboSearchCrawlerService {
    return this['searchCrawlerService'];
  }

  public getAccountService(): WeiboAccountService {
    return this['accountService'];
  }

  public getRawDataService(): RawDataService {
    return this['rawDataService'];
  }

  public getMockPage(): jest.Mocked<Page> {
    return this['mockPage'];
  }

  public getRabbitClient(): jest.Mocked<any> {
    return this['mockRabbitMQClient'];
  }

  public buildSubTaskMessage(overrides: Record<string, unknown> = {}) {
    return this['createMockSubTaskMessage'](overrides);
  }

  public buildSearchHtml(page: number, hasResults: boolean = true) {
    return this['createMockSearchPageHtml'](page, hasResults);
  }
}

/**
 * 搜索爬取集成测试 - 数字时代的搜索验证艺术品
 * 验证微博搜索爬取的完整流程和边界条件
 */
describe('SearchCrawlerIntegrationTest', () => {
  let harness: SearchCrawlerTestHarness;
  let searchCrawlerService: WeiboSearchCrawlerService;
  let rawDataService: RawDataService;

  beforeEach(async () => {
    harness = new SearchCrawlerTestHarness();
    await harness.init();

    searchCrawlerService = harness.getSearchService();
    rawDataService = harness.getRawDataService();

    await harness.setupTestAccounts();
  });

  afterEach(async () => {
    await harness.cleanupTestingModule();
  });

  describe('关键词搜索流程', () => {
    it('应该成功执行完整的关键词搜索流程', async () => {
      // 准备测试数据
      const searchResults = TestDataGenerator.generateWeiboSearchResult(3);
      const mockMessage = harness.buildSubTaskMessage({
        keyword: '测试关键词',
        taskId: 1001
      });

      // Mock页面内容
      const mockPage = harness.getMockPage();
      let currentPage = 0;

      mockPage.goto.mockImplementation(async (url: string) => {
        currentPage++;
        const pageMatch = url.match(/page=(\d+)/);
        const pageNum = pageMatch && pageMatch[1] ? parseInt(pageMatch[1], 10) : currentPage;

        const pageResult = searchResults[pageNum - 1];
        if (pageResult) {
          mockPage.content.mockResolvedValue(pageResult.html);
          mockPage.waitForSelector.mockResolvedValue(null as any);
        }

        return Promise.resolve(null);
      });

      // Mock原始数据保存
      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue({} as any);

      // 执行搜索爬取
      const result = await searchCrawlerService.crawl(mockMessage);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(3);
      expect(result.firstPostTime).toBeInstanceOf(Date);
      expect(result.lastPostTime).toBeInstanceOf(Date);

      // 验证页面访问
      expect(mockPage.goto).toHaveBeenCalledTimes(3);
      expect(mockPage.content).toHaveBeenCalledTimes(3);
      expect(mockPage.waitForSelector).toHaveBeenCalledTimes(3);

      // 验证数据保存
      expect(createSpy).toHaveBeenCalledTimes(3);
      for (let i = 0; i < 3; i++) {
        expect(createSpy).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
          sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
          sourceUrl: expect.stringContaining('weibo.com'),
          rawContent: expect.stringContaining('<html>'),
          metadata: expect.objectContaining({
            keyword: '测试关键词',
            taskId: 1001,
            page: i + 1,
            accountId: expect.any(Number)
          })
        }));
      }
    });

    it('应该为搜索结果发布微博详情爬取事件', async () => {
      const detailHtml = `
        <html>
          <body>
            <div class="WB_feed" mid="12345678901234">
              <div class="WB_detail" id="M_12345678901234">
                <div class="WB_text">首条微博</div>
              </div>
            </div>
            <div class="WB_feed" data-mid="23456789012345">
              <div class="WB_detail" id="M_23456789012345">
                <div class="WB_text">第二条微博</div>
              </div>
              <button action-data="mid=23456789012345">操作</button>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async () => {
        mockPage.content.mockResolvedValue(detailHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const message = testBase.createMockSubTaskMessage({
        keyword: '详情发布测试',
        taskId: 2024
      });

      const rabbitMQClient = testBase['mockRabbitMQClient'];
      rabbitMQClient.publish.mockClear();

      await searchCrawlerService.crawl(message);

      const detailCalls = rabbitMQClient.publish.mock.calls.filter(
        ([queue]) => queue === QUEUE_NAMES.WEIBO_DETAIL_CRAWL
      );

      expect(detailCalls).toHaveLength(2);

      const events = detailCalls.map(([, payload]) => payload as WeiboDetailCrawlEvent);
      const statusIds = events.map(event => event.statusId).sort();

      expect(statusIds).toEqual(['12345678901234', '23456789012345']);
      for (const event of events) {
        expect(event.priority).toBe(TaskPriority.HIGH);
        expect(event.sourceContext?.taskId).toBe(2024);
        expect(event.sourceContext?.keyword).toBe('详情发布测试');
        expect(event.sourceContext?.page).toBe(1);
        expect(event.sourceContext?.discoveredAtUrl).toContain('page=1');
      }
    });

    it('应该避免重复发布同一微博详情事件', async () => {
      const firstPageHtml = `
        <html>
          <body>
            <div class="WB_feed" mid="34567890123456">
              <div class="WB_detail" id="M_34567890123456">
                <div class="WB_text">第一页首条</div>
              </div>
            </div>
            <div class="WB_feed" mid="45678901234567">
              <div class="WB_detail" id="M_45678901234567">
                <div class="WB_text">第一页第二条</div>
              </div>
            </div>
            <div class="m-page">
              <a class="next" href="/search?page=2&mock=1">下一页</a>
            </div>
          </body>
        </html>
      `;

      const secondPageHtml = `
        <html>
          <body>
            <div class="WB_feed" mid="45678901234567">
              <div class="WB_detail" id="M_45678901234567">
                <div class="WB_text">重复的微博</div>
              </div>
            </div>
            <div class="WB_feed" action-data="mid=56789012345678">
              <div class="WB_detail" id="M_56789012345678">
                <div class="WB_text">第二页新微博</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const pageHtml = new Map<number, string>([
        [1, firstPageHtml],
        [2, secondPageHtml]
      ]);

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        const pageMatch = url.match(/page=(\d+)/);
        const page = pageMatch ? Number(pageMatch[1]) : 1;
        mockPage.content.mockResolvedValue(pageHtml.get(page) ?? secondPageHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const message = testBase.createMockSubTaskMessage({
        keyword: '重复检测',
        taskId: 3030
      });

      const rabbitMQClient = testBase['mockRabbitMQClient'];
      rabbitMQClient.publish.mockClear();

      await searchCrawlerService.crawl(message);

      const detailCalls = rabbitMQClient.publish.mock.calls.filter(
        ([queue]) => queue === QUEUE_NAMES.WEIBO_DETAIL_CRAWL
      );
      const events = detailCalls.map(([, payload]) => payload as WeiboDetailCrawlEvent);

      expect(events).toHaveLength(3);
      const duplicateCount = events.filter(event => event.statusId === '45678901234567').length;
      expect(duplicateCount).toBe(1);

      expect(events.map(event => event.statusId).sort()).toEqual([
        '34567890123456',
        '45678901234567',
        '56789012345678'
      ]);
    });

    it('应该正确处理搜索URL构建和时间范围', async () => {
      const mockMessage = testBase.createMockSubTaskMessage({
        keyword: '人工智能',
        start: new Date('2023-09-01T00:00:00Z'),
        end: new Date('2023-09-19T23:59:59Z')
      });

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        // 验证URL格式
        expect(url).toContain('weibo.com');
        expect(url).toContain(encodeURIComponent('人工智能'));
        expect(url).toContain('timescope=custom:2023-09-01-00:2023-09-19-23');

        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, false));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      await searchCrawlerService.crawl(mockMessage);

      expect(mockPage.goto).toHaveBeenCalledTimes(1);
    });

    it('应该支持不同的搜索类型', async () => {
      const searchTypes = [
        { type: 'DEFAULT', expectedUrl: 'timescope=custom' },
        { type: 'REAL_TIME', expectedUrl: 'type=realtime' },
        { type: 'POPULAR', expectedUrl: 'sort=hot' },
        { type: 'VIDEO', expectedUrl: 'type=video' },
        { type: 'USER', expectedUrl: 'type=user' },
        { type: 'TOPIC', expectedUrl: 'type=topic' }
      ];

      for (const { type, expectedUrl } of searchTypes) {
        const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
        mockPage.goto.mockImplementation(async (url: string) => {
          expect(url).toContain(expectedUrl);
          mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, false));
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const message = testBase.createMockSubTaskMessage({
          searchType: type
        });

        await searchCrawlerService.crawl(message);
      }
    });
  });

  describe('分页数据处理', () => {
    it('应该正确处理多页数据直到最后一页', async () => {
      const pageCount = 5;
      const searchResults = TestDataGenerator.generateWeiboSearchResult(pageCount);
      const mockMessage = testBase.createMockSubTaskMessage();

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        const pageMatch = url.match(/page=(\d+)/);
        const pageNum = pageMatch ? parseInt(pageMatch[1]) : 1;

        if (pageNum <= pageCount) {
          mockPage.content.mockResolvedValue(searchResults[pageNum - 1].html);
          mockPage.waitForSelector.mockResolvedValue();
        }

        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(pageCount);
      expect(mockPage.goto).toHaveBeenCalledTimes(pageCount);
    });

    it('应该在检测到最后一页时停止爬取', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      // 第一页有结果，第二页是最后一页
      let pageCallCount = 0;
      mockPage.goto.mockImplementation(async (url: string) => {
        pageCallCount++;

        if (pageCallCount === 1) {
          mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, true));
        } else {
          // 没有下一页按钮的HTML
          mockPage.content.mockResolvedValue(`
            <html>
              <body>
                <div class="WB_feed">最后一页内容</div>
              </body>
            </html>
          `);
        }

        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(2);
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
    });

    it('应该处理无搜索结果的情况', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, false));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(0);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('时间范围过滤', () => {
    it('应该正确提取首条和末条微博时间', async () => {
      const mockMessage = testBase.createMockSubTaskMessage({
        start: new Date('2023-09-01'),
        end: new Date('2023-09-19')
      });

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        const html = `
          <html>
            <body>
              <div class="WB_feed">
                <div class="WB_detail">
                  <div class="WB_from"><a date="1695081600">2023-09-19 00:00</a></div>
                  首条微博
                </div>
                <div class="WB_detail">
                  <div class="WB_from"><a date="1695168000">2023-09-20 00:00</a></div>
                  中间微博
                </div>
                <div class="WB_detail">
                  <div class="WB_from"><a date="1695254400">2023-09-21 00:00</a></div>
                  末条微博
                </div>
              </div>
            </body>
          </html>
        `;
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.firstPostTime).toBeInstanceOf(Date);
      expect(result.lastPostTime).toBeInstanceOf(Date);

      // 验证时间提取逻辑
      const firstPostTimeStr = result.firstPostTime.toISOString();
      const lastPostTimeStr = result.lastPostTime.toISOString();

      expect(firstPostTimeStr).toContain('2023-09-19');
      expect(lastPostTimeStr).toContain('2023-09-21');
    });

    it('应该处理相对时间格式（如"3分钟前"）', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      const now = Date.now();
      const threeMinutesAgo = new Date(now - 3 * 60 * 1000);
      const oneHourAgo = new Date(now - 60 * 60 * 1000);

      mockPage.goto.mockImplementation(async (url: string) => {
        const html = `
          <html>
            <body>
              <div class="WB_feed">
                <div class="WB_detail">
                  <div class="WB_from"><a title="3分钟前">3分钟前</a></div>
                  最新微博
                </div>
                <div class="WB_detail">
                  <div class="WB_from"><a title="1小时前">1小时前</a></div>
                  较早微博
                </div>
              </div>
            </body>
          </html>
        `;
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.firstPostTime).toBeInstanceOf(Date);
      expect(result.lastPostTime).toBeInstanceOf(Date);

      // 验证相对时间解析的准确性（允许1分钟的误差）
      const firstTimeDiff = Math.abs(result.firstPostTime.getTime() - threeMinutesAgo.getTime());
      const lastTimeDiff = Math.abs(result.lastPostTime.getTime() - oneHourAgo.getTime());

      expect(firstTimeDiff).toBeLessThan(60000); // 1分钟误差
      expect(lastTimeDiff).toBeLessThan(60000); // 1分钟误差
    });
  });

  describe('结果数据验证', () => {
    it('应该验证提取的微博数据格式', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      const detailedHtml = `
        <html>
          <body>
            <div class="WB_feed">
              <div class="WB_detail" id="M_1234567890">
                <div class="W_f14"><a usercard="id=1234567890">测试用户</a></div>
                <div class="WB_text">包含话题 #人工智能# 和提及 @科技圈 的微博内容</div>
                <div class="WB_from"><a date="1695123456789">2023-09-19 10:30</a></div>
                <div class="WB_func">
                  <div class="W_ficon"><span class="pos">1000</span></div>
                  <div class="W_ficon"><span class="pos">500</span></div>
                  <div class="W_ficon"><span class="pos">250</span></div>
                </div>
                <div class="WB_pic">
                  <img src="https://wx1.sinaimg.cn/mw2000/test1.jpg" />
                  <img src="https://wx2.sinaimg.cn/mw2000/test2.jpg" />
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(detailedHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      await searchCrawlerService.crawl(mockMessage);

      // 验证保存的数据包含必要的元信息
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
        metadata: expect.objectContaining({
          keyword: '测试关键词',
          taskId: expect.any(Number),
          page: 1,
          accountId: expect.any(Number),
          crawledAt: expect.any(Date),
          loadTimeMs: expect.any(Number),
          dataSizeBytes: expect.any(Number),
          traceId: expect.stringMatching(/^trace_\w+_\w+$/)
        })
      }));

      // 验证HTML内容结构
      const savedCall = createSpy.mock.calls[0][0];
      expect(savedCall.rawContent).toContain('<html>');
      expect(savedCall.rawContent).toContain('#人工智能#');
      expect(savedCall.rawContent).toContain('@科技圈');
      expect(savedCall.rawContent).toContain('M_1234567890');
    });

    it('应该计算和记录爬取指标', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      let pageLoadStartTime = 0;
      mockPage.goto.mockImplementation(async (url: string) => {
        pageLoadStartTime = Date.now();

        // 模拟页面加载时间
        await new Promise(resolve => setTimeout(resolve, 100));

        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, true));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);

      // 验证指标被正确计算和记录
      const savedData = (rawDataService.create as jest.Mock).mock.calls[0][0];
      expect(savedData.metadata.loadTimeMs).toBeGreaterThan(0);
      expect(savedData.metadata.dataSizeBytes).toBeGreaterThan(0);
      expect(savedData.metadata.traceId).toMatch(/^trace_\w+_\w+$/);
    });
  });

  describe('错误重试机制', () => {
    it('应该在第一页失败时返回错误', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      mockPage.goto.mockRejectedValue(new Error('网络连接失败'));
      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('网络连接失败');
      expect(result.pageCount).toBe(0);
    });

    it('应该在中间页失败时继续处理其他页面', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      let callCount = 0;
      mockPage.goto.mockImplementation(async (url: string) => {
        callCount++;

        if (callCount === 2) {
          throw new Error('第二页加载失败');
        }

        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(callCount, true));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0); // 成功的页面数

      // 应该尝试访问多页，但有一页失败
      expect(mockPage.goto).toHaveBeenCalledTimes(expect.any(Number());
      expect(createSpy).toHaveBeenCalledTimes(expect.any(Number());
    });

    it('应该处理超时错误', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      mockPage.goto.mockImplementation(async (url: string) => {
        // 模拟超时
        await new Promise(resolve => setTimeout(resolve, 15000));
        throw new Error('Navigation timeout exceeded');
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('应该处理页面元素缺失的情况', async () => {
      const mockMessage = testBase.createMockSubTaskMessage();
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue('<html><body>没有微博内容的页面</body></html>');
        mockPage.waitForSelector.mockRejectedValue(new Error('等待选择器超时'));
        return Promise.resolve();
      });

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('账号管理集成', () => {
    it('应该正确使用指定的账号进行爬取', async () => {
      const mockMessage = testBase.createMockSubTaskMessage({
        weiboAccountId: 1
      });

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, true));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const createSpy = jest.spyOn(rawDataService, 'create').mockResolvedValue();

      await searchCrawlerService.crawl(mockMessage);

      // 验证使用了指定的账号
      const savedData = createSpy.mock.calls[0][0];
      expect(savedData.metadata.accountId).toBe(1);
    });

    it('应该在账号不可用时返回错误', async () => {
      const mockMessage = testBase.createMockSubTaskMessage({
        weiboAccountId: 999 // 不存在的账号ID
      });

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('无可用微博账号');
    });

    it('应该启用账号轮换功能', async () => {
      const mockMessage = testBase.createMockSubTaskMessage({
        enableAccountRotation: true
      });

      const mockPage = testBase['mockPage'] as jest.Mocked<Page];
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(testBase.createMockSearchPageHtml(1, true));
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await searchCrawlerService.crawl(mockMessage);

      expect(result.success).toBe(true);
      // 验证使用了某个账号（不一定是特定的账号）
      const savedData = (rawDataService.create as jest.Mock).mock.calls[0][0];
      expect(savedData.metadata.accountId).toBeGreaterThan(0);
    });
  });
});
