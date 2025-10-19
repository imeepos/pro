import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';

import { WeiboCrawlerIntegrationTestBase } from '../weibo-crawler-test-base';
import { WeiboDetailCrawlerService } from '../../../src/weibo/detail-crawler.service';
import { WeiboAccountService } from '../../../src/weibo/account.service';
import { BrowserService } from '../../../src/browser/browser.service';
import { RawDataService } from '../../../src/raw-data/raw-data.service';
import { RobotsService } from '../../../src/robots/robots.service';
import { RequestMonitorService } from '../../../src/monitoring/request-monitor.service';

import { SourceType } from '@pro/types';
import { TestDataGenerator } from '../weibo-crawler-test-base';

/**
 * 微博详情爬取集成测试 - 数字时代的内容深度探索者
 *
 * 这个测试类验证微博详情爬取的精确性，确保每一条微博的每一个细节
 * 都能被完整捕获，每一个数据字段都有其存在的价值。
 *
 * 测试覆盖：
 * - 单条微博详情的完整爬取
 * - 评论数据的层级结构解析
 * - 用户信息的深度提取
 * - 媒体文件的智能下载
 * - 数据关联性的严格验证
 */
describe('WeiboDetailCrawlerIntegrationTest', () => {
  let testSuite: WeiboCrawlerIntegrationTestBase;
  let detailCrawlerService: WeiboDetailCrawlerService;
  let accountService: WeiboAccountService;
  let browserService: BrowserService;
  let rawDataService: RawDataService;
  let robotsService: RobotsService;
  let requestMonitorService: RequestMonitorService;

  beforeAll(async () => {
    testSuite = new WeiboCrawlerIntegrationTestBase();
    await testSuite.createTestingModule();

    detailCrawlerService = testSuite['detailCrawlerService'];
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

  describe('单条微博详情爬取', () => {
    it('应该能够完整爬取微博详情', async () => {
      const noteId = 'M_1234567890_abc123';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.id).toBe(noteId);
      expect(detail.content).toContain(expectedDetail.content);
      expect(detail.authorId).toBe(expectedDetail.authorId);
      expect(detail.authorName).toBe(expectedDetail.authorName);
      expect(detail.publishTime).toEqual(expectedDetail.publishTime);
      expect(detail.likeCount).toBe(expectedDetail.likeCount);
      expect(detail.repostCount).toBe(expectedDetail.repostCount);
      expect(detail.commentCount).toBe(expectedDetail.commentCount);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(noteId),
        expect.any(Object)
      );
    });

    it('应该能够处理包含特殊字符的微博内容', async () => {
      const noteId = 'M_special_content_456';
      const mockPage = testSuite['mockPage'];

      const specialContent = '包含特殊字符的内容：🚀💡📊 @用户@ #话题# 【链接】(表情)';
      const html = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1234567890">测试用户</a></div>
              <div class="WB_text">${specialContent}</div>
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

      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.content).toContain(specialContent);
      expect(detail.content).toMatch(/[@#【]\w+/); // 包含提及、话题、链接等
    });

    it('应该能够处理长文本微博', async () => {
      const noteId = 'M_long_text_789';
      const mockPage = testSuite['mockPage'];

      const longContent = '这是一条很长的微博内容。'.repeat(100);
      const html = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1234567890">长文用户</a></div>
              <div class="WB_text">${longContent}</div>
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

      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.content.length).toBeGreaterThan(longContent.length * 0.9); // 至少保留90%的内容
    });

    it('应该能够处理转发微博', async () => {
      const noteId = 'M_repost_101';
      const mockPage = testSuite['mockPage'];

      const html = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="W_f14"><a usercard="id=1111111111">转发用户</a></div>
              <div class="WB_text">转发这条微博，很有意思</div>
              <div class="WB_expand">
                <div class="WB_feed_expand">
                  <div class="WB_info">
                    <a usercard="id=2222222222">原作者</a>
                  </div>
                  <div class="WB_text">这是原始微博的内容</div>
                </div>
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

      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.isOriginal).toBe(false);
      expect(detail.content).toContain('转发这条微博');
      expect(detail.originalContent).toContain('这是原始微博的内容');
      expect(detail.originalAuthorId).toBe('2222222222');
      expect(detail.originalAuthorName).toBe('原作者');
    });

    it('应该能够处理已删除或无效的微博', async () => {
      const noteId = 'M_deleted_404';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_error">该微博已被删除</div>
          </body>
        </html>
      `);

      mockPage.waitForSelector.mockResolvedValue(false as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.status).toBe('deleted');
      expect(detail.content).toBe('该微博已被删除');
    });
  });

  describe('评论数据爬取', () => {
    it('应该能够爬取微博评论', async () => {
      const noteId = 'M_with_comments_202';
      const mockPage = testSuite['mockPage'];

      const commentHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">这条微博有评论</div>
            </div>
            <div class="WB_comment">
              <div class="comment_lists" node-type="comment_lists">
                <div class="comment_item" comment_id="C_123">
                  <div class="comment_name"><a usercard="id=3333333333">评论者1</a></div>
                  <div class="comment_txt">这是一条评论</div>
                  <div class="comment_time">3分钟前</div>
                  <div class="comment_func">
                    <span class="pos">10</span>
                  </div>
                </div>
                <div class="comment_item" comment_id="C_456">
                  <div class="comment_name"><a usercard="id=4444444444">评论者2</a></div>
                  <div class="comment_txt">这是另一条评论</div>
                  <div class="comment_time">5分钟前</div>
                  <div class="comment_func">
                    <span class="pos">5</span>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(commentHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const comments = await detailCrawlerService.crawlWeiboComments(noteId);

      expect(comments).toBeDefined();
      expect(comments.length).toBe(2);

      comments.forEach(comment => {
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('noteId');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('authorId');
        expect(comment).toHaveProperty('authorName');
        expect(comment).toHaveProperty('publishTime');
        expect(comment).toHaveProperty('likeCount');

        expect(comment.noteId).toBe(noteId);
        expect(typeof comment.content).toBe('string');
        expect(comment.content.length).toBeGreaterThan(0);
      });
    });

    it('应该能够处理分页评论', async () => {
      const noteId = 'M_many_comments_303';
      const mockPage = testSuite['mockPage'];

      const page1Html = `
        <div class="comment_lists">
          ${Array.from({ length: 10 }, (_, i) => `
            <div class="comment_item" comment_id="C_page1_${i}">
              <div class="comment_name"><a usercard="id=333${i}">评论者${i}</a></div>
              <div class="comment_txt">第1页评论${i}</div>
            </div>
          `).join('')}
          <div class="page next">更多评论</div>
        </div>
      `;

      const page2Html = `
        <div class="comment_lists">
          ${Array.from({ length: 10 }, (_, i) => `
            <div class="comment_item" comment_id="C_page2_${i}">
              <div class="comment_name"><a usercard="id=444${i}">评论者${i + 10}</a></div>
              <div class="comment_txt">第2页评论${i}</div>
            </div>
          `).join('')}
        </div>
      `;

      mockPage.content
        .mockResolvedValueOnce(page1Html)
        .mockResolvedValueOnce(page2Html);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const comments = await detailCrawlerService.crawlWeiboComments(noteId, { maxPages: 2 });

      expect(comments).toBeDefined();
      expect(comments.length).toBe(20);

      const uniqueIds = new Set(comments.map(c => c.id));
      expect(uniqueIds.size).toBe(20); // 确保没有重复评论
    });

    it('应该能够处理评论回复', async () => {
      const noteId = 'M_with_replies_404';
      const mockPage = testSuite['mockPage'];

      const replyHtml = `
        <div class="comment_lists">
          <div class="comment_item" comment_id="C_parent_123">
            <div class="comment_name"><a usercard="id=5555555555">父评论者</a></div>
            <div class="comment_txt">这是一条父评论</div>
            <div class="comment_reply">
              <div class="reply_item" reply_id="R_456">
                <div class="reply_name"><a usercard="id=6666666666">回复者</a></div>
                <div class="reply_txt">这是一条回复</div>
              </div>
            </div>
          </div>
        </div>
      `;

      mockPage.content.mockResolvedValue(replyHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const comments = await detailCrawlerService.crawlWeiboComments(noteId);

      expect(comments).toBeDefined();
      expect(comments.length).toBe(1);

      const parentComment = comments[0];
      expect(parentComment.id).toBe('C_parent_123');
      expect(parentComment.subComments).toBeDefined();
      expect(parentComment.subComments.length).toBe(1);

      const subComment = parentComment.subComments[0];
      expect(subComment.parentCommentId).toBe('C_parent_123');
      expect(subComment.content).toContain('这是一条回复');
    });

    it('应该能够处理无评论的微博', async () => {
      const noteId = 'M_no_comments_505';
      const mockPage = testSuite['mockPage'];

      const noCommentHtml = `
        <div class="WB_detail" id="M_${noteId}">
          <div class="WB_text">这条微博没有评论</div>
        </div>
        <div class="WB_comment">
          <div class="comment_empty">暂无评论</div>
        </div>
      `;

      mockPage.content.mockResolvedValue(noCommentHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const comments = await detailCrawlerService.crawlWeiboComments(noteId);

      expect(comments).toBeDefined();
      expect(comments).toEqual([]);
    });
  });

  describe('用户信息爬取', () => {
    it('应该能够爬取微博用户详细信息', async () => {
      const userId = '1234567890';
      const mockPage = testSuite['mockPage'];

      const userHtml = `
        <html>
          <body>
            <div class="WB_face">
              <img src="https://avatar.weibo.com/user123.jpg" alt="用户头像" />
            </div>
            <div class="WB_info">
              <div class="WB_name">测试用户</div>
              <div class="WB_intro">这是用户的个人简介</div>
              <div class="WB_data">
                <div class="WB_data_item">
                  <div class="WB_data_num">1000</div>
                  <div class="WB_data_text">关注</div>
                </div>
                <div class="WB_data_item">
                  <div class="WB_data_num">5000</div>
                  <div class="WB_data_text">粉丝</div>
                </div>
                <div class="WB_data_item">
                  <div class="WB_data_num">200</div>
                  <div class="WB_data_text">微博</div>
                </div>
              </div>
              <div class="WB_base">
                <div class="WB_label">性别：</div>
                <div class="WB_value">男</div>
                <div class="WB_label">地区：</div>
                <div class="WB_value">北京</div>
                <div class="WB_label">生日：</div>
                <div class="WB_value">1990-01-01</div>
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
      expect(userInfo.nickname).toBe('测试用户');
      expect(userInfo.description).toBe('这是用户的个人简介');
      expect(userInfo.avatar).toBe('https://avatar.weibo.com/user123.jpg');
      expect(userInfo.followingCount).toBe(1000);
      expect(userInfo.followersCount).toBe(5000);
      expect(userInfo.weiboCount).toBe(200);
      expect(userInfo.gender).toBe('男');
      expect(userInfo.location).toBe('北京');
    });

    it('应该能够处理VIP用户信息', async () => {
      const userId = 'vip_user_123';
      const mockPage = testSuite['mockPage'];

      const vipUserHtml = `
        <html>
          <body>
            <div class="WB_info">
              <div class="WB_name">
                <span class="W_icon_vip">V</span>
                VIP用户
              </div>
              <div class="WB_verify">
                <span class="W_icon_approve">认证</span>
                企业认证
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(vipUserHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const userInfo = await detailCrawlerService.crawlUserInfo(userId);

      expect(userInfo).toBeDefined();
      expect(userInfo.isVip).toBe(true);
      expect(userInfo.isVerified).toBe(true);
      expect(userInfo.verificationType).toBe('企业认证');
    });

    it('应该能够处理隐私保护的用户信息', async () => {
      const userId = 'private_user_456';
      const mockPage = testSuite['mockPage'];

      const privateUserHtml = `
        <html>
          <body>
            <div class="WB_info">
              <div class="WB_name">隐私用户</div>
              <div class="WB_private">该用户设置了隐私保护</div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(privateUserHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const userInfo = await detailCrawlerService.crawlUserInfo(userId);

      expect(userInfo).toBeDefined();
      expect(userInfo.userId).toBe(userId);
      expect(userInfo.nickname).toBe('隐私用户');
      expect(userInfo.isPrivate).toBe(true);
    });
  });

  describe('媒体文件下载测试', () => {
    it('应该能够下载微博中的图片', async () => {
      const noteId = 'M_with_images_606';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      // Mock download functionality
      const mockDownload = jest.fn().mockResolvedValue('/downloads/image1.jpg');
      jest.spyOn(detailCrawlerService, 'downloadImage').mockImplementation(mockDownload);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.images).toBeDefined();
      expect(detail.images.length).toBeGreaterThan(0);

      if (expectedDetail.images.length > 0) {
        expect(mockDownload).toHaveBeenCalledTimes(expectedDetail.images.length);
        detail.images.forEach(image => {
          expect(image).toMatch(/^https?:\/\//);
        });
      }
    });

    it('应该能够下载微博中的视频', async () => {
      const noteId = 'M_with_video_707';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      // Mock video download functionality
      const mockDownloadVideo = jest.fn().mockResolvedValue('/downloads/video1.mp4');
      jest.spyOn(detailCrawlerService, 'downloadVideo').mockImplementation(mockDownloadVideo);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.videos).toBeDefined();

      if (expectedDetail.videos.length > 0) {
        expect(mockDownloadVideo).toHaveBeenCalledTimes(expectedDetail.videos.length);
        detail.videos.forEach(video => {
          expect(video).toHaveProperty('url');
          expect(video).toHaveProperty('thumbnailUrl');
          expect(video).toHaveProperty('duration');
          expect(video).toHaveProperty('size');
        });
      }
    });

    it('应该能够处理下载失败的情况', async () => {
      const noteId = 'M_download_failed_808';
      const mockPage = testSuite['mockPage'];

      const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const mockDownload = jest.fn().mockRejectedValue(new Error('Download failed'));
      jest.spyOn(detailCrawlerService, 'downloadImage').mockImplementation(mockDownload);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.images).toBeDefined();
      // 即使下载失败，也应该保留原始URL
      detail.images.forEach(image => {
        expect(typeof image).toBe('string');
      });
    });

    it('应该能够处理大文件的分块下载', async () => {
      const noteId = 'M_large_file_909';
      const mockPage = testSuite['mockPage'];

      const largeFileHtml = `
        <html>
          <body>
            <div class="WB_detail" id="M_${noteId}">
              <div class="WB_text">包含大文件的微博</div>
              <div class="WB_media_video">
                <video src="https://video.weibo.com/large_video.mp4" />
              </div>
            </div>
          </body>
        </html>
      `;

      mockPage.content.mockResolvedValue(largeFileHtml);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const mockChunkedDownload = jest.fn().mockResolvedValue({
        filePath: '/downloads/large_video.mp4',
        chunks: 10,
        totalSize: 100000000 // 100MB
      });
      jest.spyOn(detailCrawlerService, 'downloadLargeVideo').mockImplementation(mockChunkedDownload);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(mockChunkedDownload).toHaveBeenCalledWith(
        expect.stringContaining('large_video.mp4'),
        expect.objectContaining({
          chunkSize: expect.any(Number),
          maxRetries: expect.any(Number)
        })
      );
    });
  });

  describe('数据关联性验证', () => {
    it('应该确保微博详情与评论的关联性', async () => {
      const noteId = 'M_relation_test_101';
      const mockPage = testSuite['mockPage'];

      const { html } = TestDataGenerator.generateWeiboDetailResult(noteId);
      const commentHtml = `
        <div class="comment_lists">
          <div class="comment_item" comment_id="C_rel_123">
            <div class="comment_txt">关联测试评论</div>
          </div>
        </div>
      `;

      mockPage.content
        .mockResolvedValueOnce(html)
        .mockResolvedValueOnce(commentHtml);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);
      const comments = await detailCrawlerService.crawlWeiboComments(noteId);

      expect(detail).toBeDefined();
      expect(comments).toBeDefined();

      comments.forEach(comment => {
        expect(comment.noteId).toBe(noteId);
        expect(detail.id).toBe(noteId);
      });
    });

    it('应该确保用户信息与微博的关联性', async () => {
      const noteId = 'M_user_relation_202';
      const authorId = 'user_author_123';
      const mockPage = testSuite['mockPage'];

      const detailHtml = `
        <div class="WB_detail" id="M_${noteId}">
          <div class="W_f14"><a usercard="id=${authorId}">关联测试用户</a></div>
          <div class="WB_text">用户关联测试内容</div>
        </div>
      `;

      const userHtml = `
        <div class="WB_info">
          <div class="WB_name">关联测试用户</div>
          <div class="WB_intro">这是关联用户的简介</div>
        </div>
      `;

      mockPage.content
        .mockResolvedValueOnce(detailHtml)
        .mockResolvedValueOnce(userHtml);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);
      const userInfo = await detailCrawlerService.crawlUserInfo(authorId);

      expect(detail).toBeDefined();
      expect(userInfo).toBeDefined();

      expect(detail.authorId).toBe(authorId);
      expect(userInfo.userId).toBe(authorId);
      expect(detail.authorName).toBe(userInfo.nickname);
    });

    it('应该验证转发微博的原始数据关联', async () => {
      const noteId = 'M_repost_relation_303';
      const originalNoteId = 'M_original_456';
      const mockPage = testSuite['mockPage'];

      const repostHtml = `
        <div class="WB_detail" id="M_${noteId}">
          <div class="W_f14"><a usercard="id=1111111111">转发者</a></div>
          <div class="WB_text">转发内容</div>
          <div class="WB_expand">
            <div class="WB_feed_expand" data-feed-id="${originalNoteId}">
              <div class="WB_info">
                <a usercard="id=2222222222">原作者</a>
              </div>
              <div class="WB_text">原始内容</div>
            </div>
          </div>
        </div>
      `;

      const originalHtml = `
        <div class="WB_detail" id="M_${originalNoteId}">
          <div class="W_f14"><a usercard="id=2222222222">原作者</a></div>
          <div class="WB_text">原始内容</div>
        </div>
      `;

      mockPage.content
        .mockResolvedValueOnce(repostHtml)
        .mockResolvedValueOnce(originalHtml);

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const repostDetail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(repostDetail).toBeDefined();
      expect(repostDetail.originalNoteId).toBe(originalNoteId);
      expect(repostDetail.originalAuthorId).toBe('2222222222');
      expect(repostDetail.originalAuthorName).toBe('原作者');
      expect(repostDetail.originalContent).toContain('原始内容');
    });

    it('应该验证媒体文件与微博的关联', async () => {
      const noteId = 'M_media_relation_404';
      const mockPage = testSuite['mockPage'];

      const { html, expectedDetail } = TestDataGenerator.generateWeiboDetailResult(noteId);
      mockPage.content.mockResolvedValue(html);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.id).toBe(noteId);

      if (expectedDetail.images.length > 0) {
        expect(detail.images).toBeDefined();
        expect(detail.images.length).toBe(expectedDetail.images.length);
        detail.images.forEach((imageUrl, index) => {
          expect(imageUrl).toBe(expectedDetail.images[index]);
        });
      }

      if (expectedDetail.videos.length > 0) {
        expect(detail.videos).toBeDefined();
        expect(detail.videos.length).toBe(expectedDetail.videos.length);
        detail.videos.forEach((video, index) => {
          expect(video.url).toBe(expectedDetail.videos[index].url);
        });
      }
    });
  });

  describe('异常处理和恢复测试', () => {
    it('应该能够处理网络超时', async () => {
      const noteId = 'M_timeout_test_505';
      const mockPage = testSuite['mockPage'];

      mockPage.goto.mockRejectedValue(new Error('Network timeout'));

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.status).toBe('error');
      expect(detail.errorMessage).toContain('timeout');
    });

    it('应该能够处理解析失败', async () => {
      const noteId = 'M_parse_error_606';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue('<div>无效的HTML</div>');
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      // 即使解析失败，也应该返回基本信息
      expect(detail.id).toBe(noteId);
    });

    it('应该能够处理权限限制', async () => {
      const noteId = 'M_permission_denied_707';
      const mockPage = testSuite['mockPage'];

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_error">需要登录才能查看</div>
          </body>
        </html>
      `);

      mockPage.waitForSelector.mockResolvedValue(false as any);

      const detail = await detailCrawlerService.crawlWeiboDetail(noteId);

      expect(detail).toBeDefined();
      expect(detail.status).toBe('restricted');
      expect(detail.requiresLogin).toBe(true);
    });
  });
});