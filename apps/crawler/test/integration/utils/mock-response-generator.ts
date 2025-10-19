/**
 * Mock响应生成器
 * 创建逼真的HTTP响应数据，支持各种测试场景
 */
import { faker } from '@faker-js/faker';
import {
  MockResponseConfig,
  WeiboAccount,
  WeiboSearchTask,
  WeiboNoteDetail,
  WeiboComment,
} from '../types/test-types.js';
import { WeiboAccountStatus, WeiboSearchTaskStatus } from '@pro/types';

/**
 * Mock响应生成器 - 测试数据的数字魔术师
 * 每一个响应都精心设计，每一个字段都有其存在的价值
 */
export class MockResponseGenerator {
  private readonly defaultHeaders = {
    'Content-Type': 'application/json',
    'Server': 'nginx/1.18.0',
    'Connection': 'keep-alive',
  };

  /**
   * 生成微博账号Mock数据
   */
  generateWeiboAccount(overrides: Partial<WeiboAccount> = {}): WeiboAccount {
    const baseAccount: WeiboAccount = {
      id: faker.number.int({ min: 1, max: 1000000 }),
      userId: faker.number.int({ min: 1, max: 100000 }),
      username: faker.internet.userName(),
      nickname: faker.person.fullName(),
      uid: faker.number.int({ min: 1000000000, max: 9999999999 }).toString(),
      status: faker.helpers.arrayElement(Object.values(WeiboAccountStatus)),
      cookies: this.generateMockCookies(),
      lastLoginAt: faker.date.recent({ days: 30 }),
      lastCheckAt: faker.date.recent({ days: 7 }),
      expiresAt: faker.date.future({ years: 1 }),
      isHealthy: faker.datatype.boolean({ probability: 0.8 }),
      errorCount: faker.number.int({ min: 0, max: 10 }),
      lastError: faker.datatype.boolean({ probability: 0.2 }) ? faker.helpers.arrayElement([
        '网络连接超时',
        '账号被临时限制',
        '登录凭证失效',
        '请求频率过高'
      ]) : undefined,
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent({ days: 30 }),
    };

    return { ...baseAccount, ...overrides };
  }

  /**
   * 生成微博搜索任务Mock数据
   */
  generateWeiboSearchTask(overrides: Partial<WeiboSearchTask> = {}): WeiboSearchTask {
    const keyword = this.generateKeyword();
    const startDate = faker.date.past({ years: 1 });
    const baseTask: WeiboSearchTask = {
      id: faker.number.int({ min: 1, max: 1000000 }),
      keyword,
      startDate,
      currentCrawlTime: faker.datatype.boolean({ probability: 0.6 })
        ? faker.date.between({ from: startDate, to: new Date() })
        : undefined,
      latestCrawlTime: faker.datatype.boolean({ probability: 0.4 })
        ? faker.date.recent({ days: 7 })
        : undefined,
      crawlInterval: faker.helpers.arrayElement(['30m', '1h', '2h', '6h', '12h', '1d']),
      nextRunAt: faker.date.future({ years: 0.01, refDate: new Date() }),
      weiboAccountId: faker.datatype.boolean({ probability: 0.7 })
        ? faker.number.int({ min: 1, max: 1000 })
        : undefined,
      enableAccountRotation: faker.datatype.boolean({ probability: 0.3 }),
      status: faker.helpers.arrayElement(Object.values(WeiboSearchTaskStatus)),
      enabled: faker.datatype.boolean({ probability: 0.9 }),
      progress: faker.number.int({ min: 0, max: 100 }),
      totalSegments: faker.number.int({ min: 10, max: 1000 }),
      noDataCount: faker.number.int({ min: 0, max: 10 }),
      noDataThreshold: 3,
      retryCount: faker.number.int({ min: 0, max: 3 }),
      maxRetries: 3,
      errorMessage: faker.datatype.boolean({ probability: 0.1 })
        ? faker.helpers.arrayElement([
            '网络请求失败',
            '数据解析错误',
            '账号登录失效',
            '请求频率限制'
          ])
        : undefined,
      longitude: faker.datatype.boolean({ probability: 0.3 })
        ? faker.location.longitude({ min: -180, max: 180 })
        : undefined,
      latitude: faker.datatype.boolean({ probability: 0.3 })
        ? faker.location.latitude({ min: -90, max: 90 })
        : undefined,
      locationAddress: faker.datatype.boolean({ probability: 0.3 })
        ? faker.location.streetAddress()
        : undefined,
      locationName: faker.datatype.boolean({ probability: 0.3 })
        ? faker.location.city()
        : undefined,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 30 }),
    };

    return { ...baseTask, ...overrides };
  }

  /**
   * 生成微博帖子详情Mock数据
   */
  generateWeiboNoteDetail(overrides: any = {}): WeiboNoteDetail {
    const baseNote: WeiboNoteDetail = {
      id: faker.string.alphanumeric({ length: 19 }),
      content: faker.lorem.paragraphs({ min: 1, max: 3 }),
      authorId: faker.number.int({ min: 1000000000, max: 9999999999 }).toString(),
      authorName: faker.person.fullName(),
      authorAvatar: faker.image.avatar(),
      publishTime: faker.date.recent({ days: 30 }),
      likeCount: faker.number.int({ min: 0, max: 50000 }),
      repostCount: faker.number.int({ min: 0, max: 10000 }),
      commentCount: faker.number.int({ min: 0, max: 5000 }),
      images: faker.datatype.boolean({ probability: 0.4 })
        ? Array.from({ length: faker.number.int({ min: 1, max: 9 }) }, () => faker.image.url())
        : [],
      videos: faker.datatype.boolean({ probability: 0.1 })
        ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => this.generateVideoInfo())
        : [],
      topics: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => `#${faker.lorem.word()}#`),
      mentions: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => `@${faker.internet.userName()}`),
      location: faker.datatype.boolean({ probability: 0.2 })
        ? {
            name: faker.location.city(),
            address: faker.location.streetAddress(),
            longitude: faker.location.longitude(),
            latitude: faker.location.latitude(),
          }
        : undefined,
      isOriginal: faker.datatype.boolean({ probability: 0.7 }),
      sourceNoteId: faker.datatype.boolean({ probability: 0.2 })
        ? faker.string.alphanumeric({ length: 19 })
        : undefined,
      rawHtml: faker.helpers.arrayElement([
        `<div class="weibo-text">${faker.lorem.paragraph()}</div>`,
        `<article>${faker.lorem.paragraphs({ min: 2, max: 4 })}</article>`,
      ]),
      crawledAt: new Date(),
    };

    return { ...baseNote, ...overrides };
  }

  /**
   * 生成微博评论Mock数据
   */
  generateWeiboComment(overrides: any = {}): WeiboComment {
    const baseComment: WeiboComment = {
      id: faker.string.alphanumeric({ length: 19 }),
      noteId: faker.string.alphanumeric({ length: 19 }),
      content: faker.lorem.sentences({ min: 1, max: 3 }),
      authorId: faker.number.int({ min: 1000000000, max: 9999999999 }).toString(),
      authorName: faker.person.fullName(),
      authorAvatar: faker.image.avatar(),
      publishTime: faker.date.recent({ days: 30 }),
      likeCount: faker.number.int({ min: 0, max: 1000 }),
      replyCount: faker.number.int({ min: 0, max: 100 }),
      parentCommentId: faker.datatype.boolean({ probability: 0.3 })
        ? faker.string.alphanumeric({ length: 19 })
        : undefined,
      subComments: faker.datatype.boolean({ probability: 0.2 })
        ? Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => this.generateWeiboComment())
        : undefined,
      rawHtml: `<div class="comment-text">${faker.lorem.sentence()}</div>`,
      crawledAt: new Date(),
    };

    return { ...baseComment, ...overrides };
  }

  /**
   * 生成API响应
   */
  generateApiResponse<T>(data: T, config: Partial<MockResponseConfig> = {}): MockResponseConfig {
    const baseResponse: MockResponseConfig = {
      status: 200,
      data,
      headers: this.defaultHeaders,
      delay: faker.datatype.boolean({ probability: 0.2 })
        ? faker.number.int({ min: 100, max: 2000 })
        : 0,
    };

    return { ...baseResponse, ...config };
  }

  /**
   * 生成分页响应
   */
  generatePaginatedResponse<T>(
    items: T[],
    page: number = 1,
    limit: number = 20,
    total?: number
  ): MockResponseConfig {
    const totalItems = total ?? items.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const pageItems = items.slice(startIndex, endIndex);

    return this.generateApiResponse({
      data: pageItems,
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  }

  /**
   * 生成错误响应
   */
  generateErrorResponse(
    message: string,
    status: number = 400,
    code?: string
  ): MockResponseConfig {
    return this.generateApiResponse({
      error: {
        message,
        code: code ?? this.generateErrorCode(status),
        timestamp: new Date().toISOString(),
        path: faker.helpers.arrayElement([
          '/api/weibo/accounts',
          '/api/weibo/tasks',
          '/api/weibo/search',
        ]),
      },
    }, { status });
  }

  /**
   * 生成搜索结果响应
   */
  generateSearchResponse(keyword: string, count: number = 20): MockResponseConfig {
    const notes = Array.from({ length: count }, () =>
      this.generateWeiboNoteDetail({
        content: this.generateContentWithKeyword(keyword),
      })
    );

    return this.generateApiResponse({
      keyword,
      notes,
      total: notes.length,
      hasMore: faker.datatype.boolean({ probability: 0.6 }),
      searchTime: faker.number.int({ min: 50, max: 500 }),
    });
  }

  /**
   * 生成统计数据响应
   */
  generateStatsResponse(): MockResponseConfig {
    return this.generateApiResponse({
      accounts: {
        total: faker.number.int({ min: 100, max: 10000 }),
        active: faker.number.int({ min: 50, max: 5000 }),
        inactive: faker.number.int({ min: 10, max: 1000 }),
        healthy: faker.number.int({ min: 80, max: 8000 }),
      },
      tasks: {
        total: faker.number.int({ min: 20, max: 500 }),
        running: faker.number.int({ min: 1, max: 50 }),
        pending: faker.number.int({ min: 5, max: 100 }),
        completed: faker.number.int({ min: 10, max: 300 }),
      },
      performance: {
        avgResponseTime: faker.number.int({ min: 100, max: 2000 }),
        successRate: faker.number.float({ min: 0.8, max: 1.0, precision: 0.01 }),
        requestsPerMinute: faker.number.int({ min: 10, max: 1000 }),
      },
    });
  }

  /**
   * 生成视频信息
   */
  private generateVideoInfo(): any {
    return {
      url: faker.internet.url(),
      thumbnailUrl: faker.image.url(),
      duration: faker.number.int({ min: 10, max: 600 }),
      width: faker.number.int({ min: 480, max: 1920 }),
      height: faker.number.int({ min: 360, max: 1080 }),
      size: faker.number.int({ min: 1024 * 1024, max: 100 * 1024 * 1024 }), // 1MB - 100MB
      format: faker.helpers.arrayElement(['mp4', 'avi', 'mov', 'wmv']),
    };
  }

  /**
   * 生成关键词
   */
  private generateKeyword(): string {
    const categories = [
      ['人工智能', '机器学习', '深度学习', '大模型'],
      ['美食', '旅游', '摄影', '健身'],
      ['iPhone', 'Android', '5G', '区块链'],
      ['电影', '音乐', '游戏', '综艺'],
      ['环保', '教育', '健康', '就业'],
    ];

    const category = faker.helpers.arrayElement(categories);
    return faker.helpers.arrayElement(category);
  }

  /**
   * 生成包含关键词的内容
   */
  private generateContentWithKeyword(keyword: string): string {
    const templates = [
      `今天看到关于${keyword}的讨论，很有意思。`,
      `${keyword}的发展真是令人惊叹！`,
      `分享一下我对${keyword}的看法...`,
      `${keyword}相关的技术突破值得关注。`,
      `最近${keyword}领域有什么新动态吗？`,
    ];

    return faker.helpers.arrayElement(templates) + ' ' + faker.lorem.sentences({ min: 1, max: 2 });
  }

  /**
   * 生成Mock Cookies
   */
  private generateMockCookies(): string {
    const cookies = [
      `SUB=${faker.string.alphanumeric({ length: 32 })}`,
      `SUE=${faker.string.alphanumeric({ length: 32 })}`,
      `SUP=${faker.string.alphanumeric({ length: 32 })}`,
      `ALF=${faker.number.int({ min: 1000000000, max: 9999999999 })}`,
      `SUBP=${faker.string.alphanumeric({ length: 64 })}`,
    ];

    return cookies.join('; ');
  }

  /**
   * 生成错误代码
   */
  private generateErrorCode(status: number): string {
    const errorCodes: Record<number, string[]> = {
      400: ['BAD_REQUEST', 'INVALID_PARAMS', 'VALIDATION_ERROR'],
      401: ['UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'],
      403: ['FORBIDDEN', 'INSUFFICIENT_PERMISSIONS'],
      404: ['NOT_FOUND', 'RESOURCE_NOT_EXISTS'],
      429: ['RATE_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS'],
      500: ['INTERNAL_SERVER_ERROR', 'SYSTEM_ERROR'],
      502: ['BAD_GATEWAY', 'UPSTREAM_ERROR'],
      503: ['SERVICE_UNAVAILABLE', 'MAINTENANCE_MODE'],
    };

    const codes = errorCodes[status] || ['UNKNOWN_ERROR'];
    return faker.helpers.arrayElement(codes);
  }
}

/**
 * 便捷的Mock生成器实例
 */
export const mockGenerator = new MockResponseGenerator();

/**
 * 便捷的Mock生成函数
 */
export const mock = {
  weiboAccount: (overrides?: Partial<WeiboAccount>) => mockGenerator.generateWeiboAccount(overrides),
  weiboSearchTask: (overrides?: Partial<WeiboSearchTask>) => mockGenerator.generateWeiboSearchTask(overrides),
  weiboNoteDetail: (overrides?: any) => mockGenerator.generateWeiboNoteDetail(overrides),
  weiboComment: (overrides?: any) => mockGenerator.generateWeiboComment(overrides),
  apiResponse: <T>(data: T, config?: Partial<MockResponseConfig>) =>
    mockGenerator.generateApiResponse(data, config),
  paginatedResponse: <T>(items: T[], page?: number, limit?: number, total?: number) =>
    mockGenerator.generatePaginatedResponse(items, page, limit, total),
  errorResponse: (message: string, status?: number, code?: string) =>
    mockGenerator.generateErrorResponse(message, status, code),
  searchResponse: (keyword: string, count?: number) =>
    mockGenerator.generateSearchResponse(keyword, count),
  statsResponse: () => mockGenerator.generateStatsResponse(),
};