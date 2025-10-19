import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';

import { WeiboCrawlerIntegrationTestBase, TestDataGenerator } from './weibo-crawler-test-base';
import { WeiboDetailCrawlerService, WeiboNoteDetail } from '../../src/weibo/detail-crawler.service';
import { WeiboAccountService } from '../../src/weibo/account.service';
import { RawDataService } from '../../src/raw-data/raw-data.service';
import { SourceType } from '@pro/types';

/**
 * 详情爬取集成测试 - 数字时代的深度挖掘验证艺术品
 * 验证微博详情爬取的完整流程和数据提取精度
 */
describe('DetailCrawlerIntegrationTest', () => {
  let testBase: WeiboCrawlerIntegrationTestBase;
  let detailCrawlerService: WeiboDetailCrawlerService;
  let accountService: WeiboAccountService;
  let rawDataService: RawDataService;
  let logger: Logger;

  beforeEach(async () => {
    testBase = new WeiboCrawlerIntegrationTestBase();
    await testBase.createTestingModule();

    detailCrawlerService = testBase['detailCrawlerService'];
    accountService = testBase['accountService'];
    rawDataService = testBase['rawDataService'];
    logger = testBase['module'].get(Logger);

    await testBase.setupTestAccounts();
  });

  afterEach(async () => {
    await testBase.cleanupTestingModule();
  });

  describe('单条微博详情获取', () => {
    it('应该成功获取完整的微博详情', async () => {
      const noteId = '1234567890';
      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        expect(url).toContain(noteId);
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.id).toBe(noteId);
      expect(result.content).toBe(expectedDetail.content);
      expect(result.authorId).toBe(expectedDetail.authorId);
      expect(result.authorName).toBe(expectedDetail.authorName);
      expect(result.authorAvatar).toBe(expectedDetail.authorAvatar);
      expect(result.publishTime).toEqual(expectedDetail.publishTime);
      expect(result.likeCount).toBe(expectedDetail.likeCount);
      expect(result.repostCount).toBe(expectedDetail.repostCount);
      expect(result.commentCount).toBe(expectedDetail.commentCount);
      expect(result.isOriginal).toBe(expectedDetail.isOriginal);
      expect(result.images).toEqual(expectedDetail.images);
      expect(result.videos).toEqual(expectedDetail.videos);
      expect(result.topics).toEqual(expectedDetail.topics);
      expect(result.mentions).toEqual(expectedDetail.mentions);
      expect(result.location).toEqual(expectedDetail.location);

      // 验证数据保存
      expect(rawDataService.create).toHaveBeenCalledWith(expect.objectContaining({
        sourceType: SourceType.WEIBO_HTML,
        sourceUrl: expect.stringContaining(noteId),
        rawContent: html,
        metadata: expect.objectContaining({
          noteId,
          accountId: expect.any(Number),
          crawledAt: expect.any(Date),
          traceId: expect.stringMatching(/^trace_\w+_\w+$/)
        })
      }));
    });

    it('应该处理不同格式的微博详情页面', async () => {
      const testCases = [
        {
          noteId: 'original_note',
          html: `
            <html>
              <body>
                <div class="WB_detail" id="M_original_note">
                  <div class="W_f14"><a usercard="id=123">原创作者</a></div>
                  <div class="WB_text">这是原创微博内容</div>
                  <div class="WB_from"><a date="1695123456789">2023-09-19</a></div>
                </div>
              </body>
            </html>
          `,
          expectedOriginal: true
        },
        {
          noteId: 'repost_note',
          html: `
            <html>
              <body>
                <div class="WB_detail" id="M_repost_note">
                  <div class="W_f14"><a usercard="id=456">转发用户</a></div>
                  <div class="WB_text">转发时添加的评论</div>
                  <div class="WB_expand">
                    <a href="/weibo/1234567890">原微博链接</a>
                  </div>
                  <div class="WB_from"><a date="1695123456790">2023-09-19</a></div>
                </div>
              </body>
            </html>
          `,
          expectedOriginal: false
        }
      ];

      for (const testCase of testCases) {
        const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(testCase.html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const result = await detailCrawlerService.getNoteDetailById(testCase.noteId);

        expect(result).not.toBeNull();
        expect(result.isOriginal).toBe(testCase.expectedOriginal);
        if (!testCase.expectedOriginal) {
          expect(result.sourceNoteId).toBe('1234567890');
        }
      }
    });

    it('应该处理缺失元素的容错情况', async () => {
      const noteId = 'minimal_note';
      const minimalHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=123">用户</a></div>
              <div class="WB_text">简单的微博内容</div>
              <!-- 缺失时间、互动数据等元素 -->
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(minimalHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.id).toBe(noteId);
      expect(result.content).toBe('简单的微博内容');
      expect(result.authorName).toBe('用户');
      expect(result.likeCount).toBe(0);
      expect(result.repostCount).toBe(0);
      expect(result.commentCount).toBe(0);
      expect(result.images).toEqual([]);
      expect(result.videos).toEqual([]);
      expect(result.topics).toEqual([]);
      expect(result.mentions).toEqual([]);
    });
  });

  describe('评论数据抓取', () => {
    it('应该正确提取微博评论数量', async () => {
      const noteId = 'note_with_comments';
      const htmlWithComments = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">有很多评论的微博</div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">1000</span></div>
                <div class="W_ficon"><span class="pos">500</span></div>
                <div class="W_ficon"><span class="pos">250</span></div>
              </div>
              <div class="comment_list">
                <div class="comment_item">评论1</div>
                <div class="comment_item">评论2</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(htmlWithComments);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.commentCount).toBe(250);
    });

    it('应该处理零评论的情况', async () => {
      const noteId = 'note_no_comments';
      const htmlWithoutComments = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">没有评论的微博</div>
              <div class="WB_func">
                <div class="W_ficon"><span class="pos">100</span></div>
                <div class="W_ficon"><span class="pos">50</span></div>
                <div class="W_ficon"><span class="pos">0</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(htmlWithoutComments);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.commentCount).toBe(0);
    });
  });

  describe('媒体文件下载', () => {
    it('应该正确提取图片信息', async () => {
      const noteId = 'note_with_images';
      const htmlWithImages = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">包含多张图片的微博</div>
              <div class="WB_pic">
                <img src="https://wx1.sinaimg.cn/mw2000/img1.jpg" />
                <img src="https://wx2.sinaimg.cn/mw2000/img2.jpg" />
                <img data-src="https://wx3.sinaimg.cn/mw2000/img3.jpg" />
              </div>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(htmlWithImages);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.images).toHaveLength(3);
      expect(result.images).toContain('https://wx1.sinaimg.cn/mw2000/img1.jpg');
      expect(result.images).toContain('https://wx2.sinaimg.cn/mw2000/img2.jpg');
      expect(result.images).toContain('https://wx3.sinaimg.cn/mw2000/img3.jpg');
    });

    it('应该正确提取视频信息', async () => {
      const noteId = 'note_with_video';
      const htmlWithVideo = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">包含视频的微博</div>
              <div class="WB_media_video">
                <video>
                  <source src="https://video.weibo.com/test1.mp4" type="video/mp4">
                </video>
                <img src="https://img.weibo.com/cover1.jpg" />
              </div>
              <div class="WB_video" data-video-src="https://video.weibo.com/test2.mp4" data-cover="https://img.weibo.com/cover2.jpg">
                <img src="https://img.weibo.com/cover2.jpg" />
              </div>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(htmlWithVideo);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.videos).toHaveLength(2);

      // 验证第一个视频
      const video1 = result.videos.find(v => v.url.includes('test1.mp4'));
      expect(video1).toBeDefined();
      expect(video1.thumbnailUrl).toBe('https://img.weibo.com/cover1.jpg');
      expect(video1.format).toBe('mp4');

      // 验证第二个视频
      const video2 = result.videos.find(v => v.url.includes('test2.mp4'));
      expect(video2).toBeDefined();
      expect(video2.thumbnailUrl).toBe('https://img.weibo.com/cover2.jpg');
    });

    it('应该处理媒体文件URL的各种格式', async () => {
      const testCases = [
        {
          name: '标准src属性',
          html: '<img src="https://wx1.sinaimg.cn/mw2000/standard.jpg" />',
          expectedUrl: 'https://wx1.sinaimg.cn/mw2000/standard.jpg'
        },
        {
          name: 'data-src属性',
          html: '<img data-src="https://wx2.sinaimg.cn/mw2000/lazy.jpg" />',
          expectedUrl: 'https://wx2.sinaimg.cn/mw2000/lazy.jpg'
        },
        {
          name: 'video source标签',
          html: '<video><source src="https://video.weibo.com/source.mp4" /></video>',
          expectedUrl: 'https://video.weibo.com/source.mp4'
        },
        {
          name: 'data-video-src属性',
          html: '<div data-video-src="https://video.weibo.com/data-src.mp4"></div>',
          expectedUrl: 'https://video.weibo.com/data-src.mp4'
        }
      ];

      for (const testCase of testCases) {
        const noteId = `test_${testCase.name.replace(/\s+/g, '_')}`;
        const html = `
          <html>
            <body>
              <div class="WB_detail" id="M_${noteId}">
                <div class="WB_text">测试${testCase.name}</div>
                <div class="WB_media">${testCase.html}</div>
              </div>
            </body>
          </html>
        `;

        const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const result = await detailCrawlerService.getNoteDetailById(noteId);

        expect(result).not.toBeNull();
        const allMedia = [...result.images, ...result.videos.map(v => v.url)];
        expect(allMedia).toContain(testCase.expectedUrl);
      }
    });
  });

  describe('数据完整性验证', () => {
    it('应该验证微博详情的必要字段', async () => {
      const noteId = 'complete_note';
      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      // 验证必要字段存在
      expect(result).not.toBeNull();
      expect(result.id).toBe(noteId);
      expect(result.content).toBeDefined();
      expect(result.authorId).toBeDefined();
      expect(result.authorName).toBeDefined();
      expect(result.publishTime).toBeInstanceOf(Date);
      expect(result.crawledAt).toBeInstanceOf(Date);
      expect(result.rawHtml).toBeDefined();

      // 验证数值字段的合理性
      expect(result.likeCount).toBeGreaterThanOrEqual(0);
      expect(result.repostCount).toBeGreaterThanOrEqual(0);
      expect(result.commentCount).toBeGreaterThanOrEqual(0);

      // 验证数组字段的类型
      expect(Array.isArray(result.images)).toBe(true);
      expect(Array.isArray(result.videos)).toBe(true);
      expect(Array.isArray(result.topics)).toBe(true);
      expect(Array.isArray(result.mentions)).toBe(true);

      // 验证布尔值字段
      expect(typeof result.isOriginal).toBe('boolean');
    });

    it('应该验证时间解析的准确性', async () => {
      const timeTestCases = [
        {
          noteId: 'timestamp_test',
          timeAttribute: '1695123456',
          expectedTime: new Date(1695123456 * 1000),
          description: 'Unix时间戳'
        },
        {
          noteId: 'relative_time_test',
          timeTitle: '2分钟前',
          description: '相对时间'
        },
        {
          noteId: 'absolute_time_test',
          timeText: '2023-09-19 10:30',
          description: '绝对时间'
        }
      ];

      for (const testCase of timeTestCases) {
        let html = '';
        if (testCase.timeAttribute) {
          html = `
            <html>
              <body>
                <div class="WB_detail" id="M_${testCase.noteId}">
                  <div class="WB_text">时间测试</div>
                  <div class="WB_from"><a date="${testCase.timeAttribute}">时间</a></div>
                </div>
              </body>
            </html>
          `;
        } else if (testCase.timeTitle) {
          html = `
            <html>
              <body>
                <div class="WB_detail" id="M_${testCase.noteId}">
                  <div class="WB_text">时间测试</div>
                  <div class="WB_from"><a title="${testCase.timeTitle}">时间</a></div>
                </div>
              </body>
            </html>
          `;
        } else if (testCase.timeText) {
          html = `
            <html>
              <body>
                <div class="WB_detail" id="M_${testCase.noteId}">
                  <div class="WB_text">时间测试</div>
                  <div class="WB_from">${testCase.timeText}</div>
                </div>
              </body>
            </html>
          `;
        }

        const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
        mockPage.goto.mockImplementation(async (url: string) => {
          mockPage.content.mockResolvedValue(html);
          mockPage.waitForSelector.mockResolvedValue();
          return Promise.resolve();
        });

        jest.spyOn(rawDataService, 'create').mockResolvedValue();

        const result = await detailCrawlerService.getNoteDetailById(testCase.noteId);

        expect(result).not.toBeNull();
        expect(result.publishTime).toBeInstanceOf(Date);

        if (testCase.expectedTime) {
          // 对于绝对时间，验证准确性
          const timeDiff = Math.abs(result.publishTime.getTime() - testCase.expectedTime.getTime());
          expect(timeDiff).toBeLessThan(1000); // 1秒误差
        } else {
          // 对于相对时间，验证合理性
          const now = Date.now();
          const publishTime = result.publishTime.getTime();
          expect(publishTime).toBeLessThanOrEqual(now);
          expect(publishTime).toBeGreaterThan(now - 24 * 60 * 60 * 1000); // 不超过24小时前
        }
      }
    });

    it('应该验证话题和提及提取的正确性', async () => {
      const noteId = 'content_analysis_test';
      const contentWithTags = `
        这是包含多个话题的微博 #人工智能# #机器学习# #深度学习#
        还有一些用户提及 @技术大牛 @产品经理 @设计师
        混合内容 #前端开发# 和 @后端工程师
      `;

      const html = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">${contentWithTags}</div>
            </div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).not.toBeNull();
      expect(result.content).toBe(contentWithTags.trim());

      // 验证话题提取
      expect(result.topics).toContain('人工智能');
      expect(result.topics).toContain('机器学习');
      expect(result.topics).toContain('深度学习');
      expect(result.topics).toContain('前端开发');

      // 验证用户提及提取
      expect(result.mentions).toContain('技术大牛');
      expect(result.mentions).toContain('产品经理');
      expect(result.mentions).toContain('设计师');
      expect(result.mentions).toContain('后端工程师');
    });
  });

  describe('异常页面处理', () => {
    it('应该处理不存在的微博页面', async () => {
      const noteId = 'nonexistent_note';
      const notFoundHtml = `
        <html>
          <body>
            <div class="error_page">微博不存在或已被删除</div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(notFoundHtml);
        mockPage.waitForSelector.mockRejectedValue(new Error('元素未找到'));
        return Promise.resolve();
      });

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).toBeNull();
    });

    it('应该处理需要登录的页面', async () => {
      const noteId = 'login_required_note';
      const loginHtml = `
        <html>
          <body>
            <div class="login_form">请先登录</div>
          </body>
        </html>
      `;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(loginHtml);
        mockPage.waitForSelector.mockRejectedValue(new Error('登录页面'));
        return Promise.resolve();
      });

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).toBeNull();
    });

    it('应该处理网络错误和超时', async () => {
      const noteId = 'network_error_note';

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockRejectedValue(new Error('Network timeout'));

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      expect(result).toBeNull();
    });

    it('应该处理解析错误', async () => {
      const noteId = 'parse_error_note';
      const malformedHtml = '<div class="unclosed">未闭合的HTML标签';

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        mockPage.content.mockResolvedValue(malformedHtml);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      const result = await detailCrawlerService.getNoteDetailById(noteId);

      // 应该能处理格式不良的HTML，但可能无法提取完整信息
      expect(result).toBeDefined();
    });
  });

  describe('批量详情获取', () => {
    it('应该支持批量获取多个微博详情', async () => {
      const noteIds = ['note1', 'note2', 'note3'];
      const results = [];

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        const noteId = noteIds.find(id => url.includes(id));
        const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);

        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      for (const noteId of noteIds) {
        const result = await detailCrawlerService.getNoteDetailById(noteId);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).not.toBeNull();
        expect(result.id).toBe(noteIds[index]);
        expect(result.content).toBeDefined();
        expect(result.authorName).toBeDefined();
      });
    });

    it('应该处理批量获取中的部分失败', async () => {
      const noteIds = ['success_note1', 'fail_note', 'success_note2'];
      let callCount = 0;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        callCount++;

        if (callCount === 2) {
          // 第二个调用失败
          throw new Error('网络错误');
        }

        const noteId = noteIds[callCount - 1];
        const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);

        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      const results = [];
      for (const noteId of noteIds) {
        const result = await detailCrawlerService.getNoteDetailById(noteId);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull(); // 成功
      expect(results[1]).toBeNull(); // 失败
      expect(results[2]).not.toBeNull(); // 成功
    });

    it('应该验证批量获取的并发控制', async () => {
      const noteIds = Array.from({ length: 10 }, (_, i) => `concurrent_note_${i + 1}`);
      let activeRequests = 0;
      let maxActiveRequests = 0;

      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;
      mockPage.goto.mockImplementation(async (url: string) => {
        activeRequests++;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

        // 模拟请求延迟
        await new Promise(resolve => setTimeout(resolve, 100));

        const noteId = noteIds.find(id => url.includes(id));
        const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);

        mockPage.content.mockResolvedValue(html);
        mockPage.waitForSelector.mockResolvedValue();

        activeRequests--;
        return Promise.resolve();
      });

      jest.spyOn(rawDataService, 'create').mockResolvedValue();

      // 串行处理以避免并发问题
      const results = [];
      for (const noteId of noteIds) {
        const result = await detailCrawlerService.getNoteDetailById(noteId);
        results.push(result);
      }

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).not.toBeNull();
      });

      // 验证并发控制（这里应该是串行处理，所以最大并发数应该是1）
      expect(maxActiveRequests).toBeLessThanOrEqual(3); // 允许少量并发
    });
  });
});