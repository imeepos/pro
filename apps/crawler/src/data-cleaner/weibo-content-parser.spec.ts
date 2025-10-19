import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@pro/logger';
import { WeiboContentParser } from './weibo-content-parser.service';

describe('WeiboContentParser - 微博内容解析器的艺术性测试', () => {
  let parser: WeiboContentParser;
  let mockLogger: jest.Mocked<Logger>;

  // 基于MediaCrawler的测试数据
  const mockWeiboData = {
    cards: [
      {
        card_type: 9,
        mblog: {
          id: '1234567890',
          mid: '1234567890',
          created_at: '2小时前',
          text: '今天天气真好！#天气# #生活# @张三 https://weibo.com/123',
          source: 'iPhone客户端',
          user: {
            id: '987654321',
            screen_name: '测试用户',
            profile_image_url: 'http://example.com/avatar.jpg',
            verified: true,
            verified_type: 0,
            verified_reason: '知名博主',
            followers_count: 10000,
            friends_count: 500,
            statuses_count: 1000,
            gender: 'm',
            location: '北京'
          },
          reposts_count: 10,
          comments_count: 25,
          attitudes_count: 100,
          pics: [
            {
              pid: 'abc123',
              url: 'http://example.com/image1.jpg',
              large: {
                url: 'http://example.com/image1_large.jpg',
                width: 1920,
                height: 1080
              }
            }
          ],
          region_name: '北京朝阳区'
        }
      },
      {
        card_type: 9,
        mblog: {
          id: '1234567891',
          mid: '1234567891',
          created_at: '刚刚',
          text: '转发微博',
          source: 'Android客户端',
          user: {
            id: '987654322',
            screen_name: '转发用户',
            profile_image_url: 'http://example.com/avatar2.jpg',
            verified: false,
            verified_type: -1,
            followers_count: 100,
            friends_count: 50,
            statuses_count: 100,
            gender: 'f',
            location: '上海'
          },
          reposts_count: 0,
          comments_count: 0,
          attitudes_count: 0,
          retweeted_status: {
            id: '1234567890',
            text: '原微博内容',
            user: {
              id: '987654321',
              screen_name: '原创用户'
            }
          }
        }
      }
    ],
    errno: 0,
    msg: 'success',
    total_number: 2
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboContentParser,
        {
          provide: Logger,
          useValue: mockLogger
        }
      ]
    }).compile();

    parser = module.get<WeiboContentParser>(WeiboContentParser);
  });

  describe('parseWeiboContent - 微博内容解析的核心艺术', () => {
    it('应该优雅地解析完整的微博数据', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);

      expect(result).toBeDefined();
      expect(result.posts).toHaveLength(2);
      expect(result.users).toHaveLength(2);
      expect(result.metadata).toBeDefined();

      // 验证第一个帖子
      const firstPost = result.posts[0];
      expect(firstPost.id).toBe('1234567890');
      expect(firstPost.content.cleaned).toBe('今天天气真好！');
      expect(firstPost.content.hashtags).toContain('天气');
      expect(firstPost.content.hashtags).toContain('生活');
      expect(firstPost.content.mentions).toContain('张三');
      expect(firstPost.content.links).toContain('https://weibo.com/123');

      // 验证用户信息
      const firstUser = result.users.find(u => u.id === '987654321');
      expect(firstUser).toBeDefined();
      expect(firstUser.profile.screenName).toBe('测试用户');
      expect(firstUser.verification.isVerified).toBe(true);
      expect(firstUser.statistics.followers).toBe(10000);

      // 验证元数据
      expect(result.metadata.statistics.totalPosts).toBe(2);
      expect(result.metadata.statistics.totalUsers).toBe(2);
      expect(result.metadata.quality.overallScore).toBeGreaterThan(0);
    });

    it('应该处理空数据并返回空结果', async () => {
      const emptyData = { cards: [] };
      const result = await parser.parseWeiboContent(emptyData);

      expect(result.posts).toHaveLength(0);
      expect(result.users).toHaveLength(0);
      expect(result.comments).toHaveLength(0);
      expect(result.media).toHaveLength(0);
    });

    it('应该处理无效数据并优雅地失败', async () => {
      const invalidData = { cards: [{ card_type: 8 }] }; // 错误的card_type

      const result = await parser.parseWeiboContent(invalidData);

      expect(result.posts).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('应该根据选项控制解析行为', async () => {
      const options = {
        extractFullContent: false,
        includeMediaAnalysis: false,
        calculateQualityScores: false,
        maxMediaItems: 0
      };

      const result = await parser.parseWeiboContent(mockWeiboData, options);

      expect(result.posts).toHaveLength(2);
      // 媒体分析应该被禁用
      expect(result.media).toHaveLength(0);
    });
  });

  describe('时间戳处理 - MediaCrawler启发的标准化艺术', () => {
    it('应该正确解析相对时间', async () => {
      const dataWithRelativeTime = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            created_at: '3分钟前'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithRelativeTime);
      const post = result.posts[0];

      expect(post.timing.createdAt).toBeInstanceOf(Date);
      expect(post.timing.createdAtStandard).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(post.timing.relativeTime).toBe('3分钟前');
    });

    it('应该处理"刚刚"时间', async () => {
      const dataWithJustNow = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            created_at: '刚刚'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithJustNow);
      const post = result.posts[0];

      expect(post.timing.createdAt).toBeInstanceOf(Date);
      const timeDiff = Date.now() - post.timing.createdAt.getTime();
      expect(timeDiff).toBeLessThan(5000); // 应该在5秒内
    });
  });

  describe('内容清理和解析 - 文本的艺术性处理', () => {
    it('应该正确清理HTML标签和实体', async () => {
      const dataWithHtml = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            text: '<b>重要</b>消息 &amp; 提示 <script>alert(1)</script>'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithHtml);
      const post = result.posts[0];

      expect(post.content.cleaned).toBe('重要消息 & 提示 alert(1)');
      expect(post.content.raw).toContain('<b>');
    });

    it('应该正确提取话题标签', async () => {
      const dataWithHashtags = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            text: '今天讨论#科技#和#生活#话题 #测试#'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithHashtags);
      const post = result.posts[0];

      expect(post.content.hashtags).toEqual(['科技', '生活', '测试']);
    });

    it('应该正确提取提及用户', async () => {
      const dataWithMentions = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            text: '感谢@张三和@李四的支持'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithMentions);
      const post = result.posts[0];

      expect(post.content.mentions).toEqual(['张三', '李四']);
    });
  });

  describe('用户信息解析 - 用户画像的艺术性构建', () => {
    it('应该正确解析用户认证信息', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);
      const verifiedUser = result.users.find(u => u.id === '987654321');

      expect(verifiedUser.verification.isVerified).toBe(true);
      expect(verifiedUser.verification.verificationLevel).toBe('yellow');
      expect(verifiedUser.verification.verifiedReason).toBe('知名博主');
    });

    it('应该计算用户影响力分数', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);
      const user = result.users.find(u => u.id === '987654321');

      expect(user.influence.influenceScore).toBeGreaterThan(0);
      expect(user.influence.categories).toContain('verified');
    });

    it('应该正确解析用户统计信息', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);
      const user = result.users.find(u => u.id === '987654321');

      expect(user.statistics.followers).toBe(10000);
      expect(user.statistics.following).toBe(500);
      expect(user.statistics.posts).toBe(1000);
    });
  });

  describe('媒体内容解析 - 媒体的艺术性处理', () => {
    it('应该正确解析图片信息', async () => {
      const options = { includeMediaAnalysis: true };
      const result = await parser.parseWeiboContent(mockWeiboData, options);

      expect(result.media).toHaveLength(1);
      const mediaItem = result.media[0];
      expect(mediaItem.type).toBe('image');
      expect(mediaItem.url.original).toBe('http://example.com/image1.jpg');
      expect(mediaItem.url.large).toBe('http://example.com/image1_large.jpg');
      expect(mediaItem.metadata.width).toBe(1920);
      expect(mediaItem.metadata.height).toBe(1080);
    });

    it('应该限制媒体项目数量', async () => {
      const options = { includeMediaAnalysis: true, maxMediaItems: 0 };
      const result = await parser.parseWeiboContent(mockWeiboData, options);

      expect(result.media).toHaveLength(0);
    });
  });

  describe('转发内容处理 - 转发关系的艺术性分析', () => {
    it('应该正确识别转发内容', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);
      const repostPost = result.posts.find(p => p.id === '1234567891');

      expect(repostPost.interaction.isRepost).toBe(true);
      expect(repostPost.interaction.originalPost).toBeDefined();
      expect(repostPost.interaction.originalPost.id).toBe('1234567890');
    });
  });

  describe('数据质量评估 - 质量的艺术性鉴赏', () => {
    it('应该计算帖子质量分数', async () => {
      const result = await parser.parseWeiboContent(mockWeiboData);
      const post = result.posts[0];

      expect(post.quality.score).toBeGreaterThan(0);
      expect(post.quality.completeness).toBeGreaterThan(0);
      expect(post.quality.score).toBeLessThanOrEqual(1);
    });

    it('应该检测数据质量问题', async () => {
      const lowQualityData = {
        cards: [{
          card_type: 9,
          mblog: {
            id: '123',
            text: '短',
            user: null
          }
        }]
      };

      const result = await parser.parseWeiboContent(lowQualityData);
      const post = result.posts[0];

      expect(post.quality.issues.length).toBeGreaterThan(0);
      expect(post.quality.score).toBeLessThan(0.5);
    });
  });

  describe('错误处理 - 错误的哲学性处理', () => {
    it('应该优雅处理JSON解析错误', async () => {
      const invalidJson = '{ invalid json }';

      await expect(parser.parseWeiboContent(invalidJson))
        .rejects
        .toThrow();
    });

    it('应该处理缺少必要字段的数据', async () => {
      const incompleteData = {
        cards: [{
          card_type: 9,
          mblog: {
            // 缺少id字段
            text: '测试内容'
          }
        }]
      };

      const result = await parser.parseWeiboContent(incompleteData);
      expect(result.posts).toHaveLength(0); // 应该过滤掉无效帖子
    });

    it('应该记录详细的错误信息', async () => {
      const invalidData = null;

      try {
        await parser.parseWeiboContent(invalidData);
      } catch (error) {
        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error.mock.calls[0][1]).toHaveProperty('parseId');
        expect(mockLogger.error.mock.calls[0][1]).toHaveProperty('errorType');
      }
    });
  });

  describe('性能测试 - 性能的艺术性优化', () => {
    it('应该在合理时间内处理大量数据', async () => {
      // 创建大量测试数据
      const largeData = {
        cards: Array.from({ length: 100 }, (_, i) => ({
          card_type: 9,
          mblog: {
            id: `post_${i}`,
            text: `测试内容 ${i}`,
            user: {
              id: `user_${i}`,
              screen_name: `用户${i}`
            },
            created_at: '1小时前'
          }
        }))
      };

      const startTime = Date.now();
      const result = await parser.parseWeiboContent(largeData);
      const processingTime = Date.now() - startTime;

      expect(result.posts).toHaveLength(100);
      expect(result.users).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该计算处理吞吐量', async () => {
      const startTime = Date.now();
      await parser.parseWeiboContent(mockWeiboData);
      const processingTime = Date.now() - startTime;

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('微博内容解析艺术品创作完成'),
        expect.objectContaining({
          throughput: expect.any(Number)
        }),
        'WeiboContentParser'
      );
    });
  });

  describe('边界情况处理 - 边界的艺术性探索', () => {
    it('应该处理超长文本内容', async () => {
      const longText = 'a'.repeat(10000);
      const dataWithLongText = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            text: longText
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithLongText);
      expect(result.posts[0].content.cleaned.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符和表情符号', async () => {
      const dataWithSpecialChars = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            text: '测试😀😊🎉[哈哈][微笑]特殊字符'
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithSpecialChars);
      expect(result.posts[0].content.emojis.length).toBeGreaterThan(0);
    });

    it('应该处理空的用户信息', async () => {
      const dataWithEmptyUser = {
        cards: [{
          card_type: 9,
          mblog: {
            ...mockWeiboData.cards[0].mblog,
            user: null
          }
        }]
      };

      const result = await parser.parseWeiboContent(dataWithEmptyUser);
      expect(result.posts[0].author.id).toBe('');
    });
  });
});