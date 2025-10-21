import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';

import { WeiboSearchCrawlerService } from '../../src/weibo/search-crawler.service';
import { WeiboMultiModeCrawlerService } from '../../src/weibo/multi-mode-crawler.service';
import { WeiboDetailCrawlerService } from '../../src/weibo/detail-crawler.service';
import { WeiboAccountService } from '../../src/weibo/account.service';
import { BrowserService } from '../../src/browser/browser.service';
import { RawDataService } from '../../src/raw-data/raw-data.service';
import { RobotsService } from '../../src/robots/robots.service';
import { RequestMonitorService } from '../../src/monitoring/request-monitor.service';

import { WeiboAccountEntity } from '@pro/entities';
import { SourceType, WeiboSearchType, WeiboCrawlMode } from '@pro/types';
import { RabbitMQClient } from '@pro/rabbitmq';

/**
 * 微博爬取集成测试基类 - 数字时代的测试艺术品
 * 提供优雅的测试基础设施和Mock服务
 */
export abstract class WeiboCrawlerIntegrationTestBase {
  protected module: TestingModule;
  protected searchCrawlerService: WeiboSearchCrawlerService;
  protected detailCrawlerService: WeiboDetailCrawlerService;
  protected accountService: WeiboAccountService;
  protected browserService: BrowserService;
  protected rawDataService: RawDataService;
  protected robotsService: RobotsService;
  protected requestMonitorService: RequestMonitorService;
  protected weiboAccountRepo: Repository<WeiboAccountEntity>;

  protected mockPage: jest.Mocked<Page>;
  protected mockRabbitMQClient: jest.Mocked<RabbitMQClient>;

  async createTestingModule(): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            {
              key: 'CRAWLER_CONFIG',
              load: () => ({
                maxPages: 5,
                requestDelay: { min: 100, max: 300 },
                pageTimeout: 10000,
                maxRetries: 3,
                retryDelay: 1000
              })
            },
            {
              key: 'RABBITMQ_CONFIG',
              load: () => ({
                url: 'mock://rabbitmq',
                queues: {
                  crawlQueue: 'crawl.queue',
                  statusQueue: 'status.queue'
                }
              })
            },
            {
              key: 'WEIBO_CONFIG',
              load: () => ({
                baseUrl: 'https://weibo.com',
                searchUrl: 'https://weibo.com/search',
                selectors: {
                  feedCard: '.WB_feed',
                  timeElement: '.WB_from',
                  pagination: {
                    nextButton: '.page.next',
                    pageInfo: '.page_info',
                    noResult: '.no_result'
                  }
                }
              })
            }
          ]
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [WeiboAccountEntity],
          synchronize: true,
          logging: false
        }),
        TypeOrmModule.forFeature([WeiboAccountEntity])
      ],
      providers: [
        WeiboSearchCrawlerService,
        WeiboDetailCrawlerService,
        WeiboAccountService,
        BrowserService,
        RawDataService,
        RobotsService,
        RequestMonitorService,
        {
          provide: WeiboMultiModeCrawlerService,
          useValue: {
            execute: jest.fn(),
          },
        },
        Logger
      ]
    })
    .overrideProvider(RabbitMQClient)
    .useValue(createMockRabbitMQClient())
    .compile();

    this.module = moduleRef;
    this.searchCrawlerService = moduleRef.get(WeiboSearchCrawlerService);
    this.detailCrawlerService = moduleRef.get(WeiboDetailCrawlerService);
    this.accountService = moduleRef.get(WeiboAccountService);
    this.browserService = moduleRef.get(BrowserService);
    this.rawDataService = moduleRef.get(RawDataService);
    this.robotsService = moduleRef.get(RobotsService);
    this.requestMonitorService = moduleRef.get(RequestMonitorService);
    this.weiboAccountRepo = moduleRef.get<Repository<WeiboAccountEntity>>('WeiboAccountEntityRepository');

    await this.setupMockServices();
  }

  private async setupMockServices(): Promise<void> {
    // Mock Playwright Page
    this.mockPage = {
      goto: jest.fn(),
      content: jest.fn(),
      waitForSelector: jest.fn(),
      close: jest.fn(),
      url: jest.fn().mockReturnValue('https://weibo.com/test')
    } as any;

    // Mock BrowserService
    jest.spyOn(this.browserService, 'createPage').mockResolvedValue(this.mockPage);
    jest.spyOn(this.browserService, 'closeContext').mockResolvedValue();

    // Mock RobotsService
    jest.spyOn(this.robotsService, 'isUrlAllowed').mockResolvedValue(true);
    jest.spyOn(this.robotsService, 'getCrawlDelay').mockResolvedValue(1);

    // Mock RequestMonitorService
    jest.spyOn(this.requestMonitorService, 'waitForNextRequest').mockResolvedValue();
    jest.spyOn(this.requestMonitorService, 'recordRequest').mockReturnValue();
    jest.spyOn(this.requestMonitorService, 'getCurrentDelay').mockReturnValue(1000);
    jest.spyOn(this.requestMonitorService, 'reset').mockReturnValue();
  }

  async setupTestAccounts(): Promise<void> {
    const testAccounts = [
      {
        id: 1,
        weiboUid: '1234567890',
        weiboNickname: '测试账号1',
        status: 'active',
        cookies: JSON.stringify([
          { name: 'test_cookie_1', value: 'value1', domain: '.weibo.com' },
          { name: 'test_cookie_2', value: 'value2', domain: '.weibo.com' }
        ])
      },
      {
        id: 2,
        weiboUid: '0987654321',
        weiboNickname: '测试账号2',
        status: 'active',
        cookies: JSON.stringify([
          { name: 'test_cookie_3', value: 'value3', domain: '.weibo.com' },
          { name: 'test_cookie_4', value: 'value4', domain: '.weibo.com' }
        ])
      }
    ];

    for (const accountData of testAccounts) {
      const account = this.weiboAccountRepo.create(accountData);
      await this.weiboAccountRepo.save(account);
    }

    // 初始化账号服务
    await this.accountService.onModuleInit();
  }

  async cleanupTestingModule(): Promise<void> {
    if (this.module) {
      await this.module.close();
    }
  }

  protected createMockSearchPageHtml(page: number, hasResults: boolean = true): string {
    if (!hasResults) {
      return `
        <html>
          <body>
            <div class="no_result">未找到相关结果</div>
          </body>
        </html>
      `;
    }

    return `
      <html>
        <body>
          <div class="WB_feed">
            <div class="WB_detail" id="M_1234567890">
              <div class="W_f14"><a usercard="id=1234567890">测试用户1</a></div>
              <div class="WB_text">这是第${page}页的测试微博内容 #测试话题# @测试用户</div>
              <div class="WB_from"><a date="1695123456789">3分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">25</span></div>
              </div>
            </div>
            <div class="WB_detail" id="M_2345678901">
              <div class="W_f14"><a usercard="id=2345678901">测试用户2</a></div>
              <div class="WB_text">这是第${page}页的第二条测试微博</div>
              <div class="WB_from"><a date="1695123456790">5分钟前</a></div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">200</span></div>
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
              </div>
            </div>
          </div>
          ${page < 3 ? '<div class="page next">下一页</div><div class="page_info">第${page}页</div>' : ''}
        </body>
      </html>
    `;
  }

  protected createMockDetailPageHtml(noteId: string): string {
    return `
      <html>
        <body>
          <div class="WB_detail" id="M_${noteId}">
            <div class="W_f14">
              <a usercard="id=1234567890">测试用户1</a>
            </div>
            <div class="WB_text">
              这是一条详细的微博内容，包含了丰富的信息 #测试话题# @另一个用户
              <img src="https://wx1.sinaimg.cn/mw2000/test1.jpg" />
              <img src="https://wx2.sinaimg.cn/mw2000/test2.jpg" />
            </div>
            <div class="WB_from">
              <a date="1695123456789">2023-09-19 10:30</a>
              <span class="W_icon_bicon">北京市</span>
            </div>
            <div class="WB_func">
              <div class="W_ficon"><span class="pos">1000</span></div>
              <div class="W_ficon"><span class="pos">500</span></div>
              <div class="W_ficon"><span class="pos">250</span></div>
            </div>
            <div class="WB_media_video">
              <video src="https://video.weibo.com/test.mp4" />
              <img src="https://img.weibo.com/test_cover.jpg" />
            </div>
          </div>
        </body>
      </html>
    `;
  }

  protected createMockSubTaskMessage(overrides: Partial<any> = {}) {
    return {
      taskId: 1,
      keyword: '测试关键词',
      start: new Date('2023-09-01'),
      end: new Date('2023-09-19'),
      isInitialCrawl: true,
      enableAccountRotation: true,
      ...overrides
    };
  }

  protected async verifySavedRawData(expectedCount: number): Promise<void> {
    // 这里可以添加验证原始数据保存的逻辑
    // 具体实现取决于RawDataService的API
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建Mock RabbitMQ客户端
 */
function createMockRabbitMQClient(): jest.Mocked<RabbitMQClient> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn().mockReturnValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  } as any;
}

/**
 * 测试数据生成器 - 创造数字时代的测试数据艺术
 */
export class TestDataGenerator {
  static generateWeiboSearchResult(pageCount: number = 3): Array<{
    html: string;
    noteIds: string[];
    authors: string[];
    times: string[];
  }> {
    const results = [];

    for (let page = 1; page <= pageCount; page++) {
      const noteIds = [];
      const authors = [];
      const times = [];

      let html = '<html><body><div class="WB_feed">';

      for (let i = 1; i <= 10; i++) {
        const noteId = `M_${Date.now()}_${page}_${i}`;
        const authorId = `author_${page}_${i}`;
        const time = Date.now() - (page * 10 + i) * 60000; // 递减的时间戳

        noteIds.push(noteId);
        authors.push(authorId);
        times.push(new Date(time).toISOString());

        html += `
          <div class="WB_detail" id="${noteId}">
            <div class="W_f14"><a usercard="id=${authorId}">用户${authorId}</a></div>
            <div class="WB_text">第${page}页第${i}条微博内容 #测试#</div>
            <div class="WB_from"><a date="${Math.floor(time / 1000)}">${i}分钟前</a></div>
            <div class="WB_func">
              <div class="W_ficon"><span class="pos">${page * i * 10}</span></div>
              <div class="W_ficon"><span class="pos">${page * i * 5}</span></div>
              <div class="W_ficon"><span class="pos">${page * i * 2}</span></div>
            </div>
          </div>
        `;
      }

      html += page < pageCount ? '<div class="page next">下一页</div>' : '';
      html += '</div></body></html>';

      results.push({ html, noteIds, authors, times });
    }

    return results;
  }

  static generateWeiboDetailResult(noteId: string): {
    html: string;
    expectedDetail: any;
  } {
    const expectedDetail = {
      id: noteId,
      content: `微博详情内容 - ${noteId}`,
      authorId: '1234567890',
      authorName: '测试用户',
      authorAvatar: 'https://avatar.weibo.com/test.jpg',
      publishTime: new Date('2023-09-19T10:30:00Z'),
      likeCount: 1000,
      repostCount: 500,
      commentCount: 250,
      images: [
        'https://wx1.sinaimg.cn/mw2000/test1.jpg',
        'https://wx2.sinaimg.cn/mw2000/test2.jpg'
      ],
      videos: [{
        url: 'https://video.weibo.com/test.mp4',
        thumbnailUrl: 'https://img.weibo.com/test_cover.jpg',
        duration: 30,
        width: 1280,
        height: 720,
        size: 1024000,
        format: 'mp4'
      }],
      topics: ['测试话题'],
      mentions: ['另一个用户'],
      location: {
        name: '北京市',
        address: '北京市',
        longitude: 116.4074,
        latitude: 39.9042
      },
      isOriginal: true
    };

    const html = `
      <html>
        <body>
          <div class="WB_detail" id="M_${noteId}">
            <div class="W_f14">
              <a usercard="id=${expectedDetail.authorId}">${expectedDetail.authorName}</a>
            </div>
            <div class="WB_text">
              ${expectedDetail.content} #${expectedDetail.topics[0]}# @${expectedDetail.mentions[0]}
            </div>
            <div class="WB_from">
              <a date="${Math.floor(expectedDetail.publishTime.getTime() / 1000)}">2023-09-19 10:30</a>
              <span class="W_icon_bicon">${expectedDetail.location.name}</span>
            </div>
            <div class="WB_func">
              <div class="W_ficon"><span class="pos">${expectedDetail.likeCount}</span></div>
              <div class="W_ficon"><span class="pos">${expectedDetail.repostCount}</span></div>
              <div class="W_ficon"><span class="pos">${expectedDetail.commentCount}</span></div>
            </div>
            <div class="WB_pic">
              ${expectedDetail.images.map(img => `<img src="${img}" />`).join('')}
            </div>
            <div class="WB_media_video">
              <video src="${expectedDetail.videos[0].url}" />
              <img src="${expectedDetail.videos[0].thumbnailUrl}" />
            </div>
          </div>
        </body>
      </html>
    `;

    return { html, expectedDetail };
  }
}
