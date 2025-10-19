/**
 * 微博测试数据工厂
 * 创造逼真的测试数据，模拟真实世界的数据结构
 */
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboSearchTaskEntity } from '@pro/entities';
import {
  WeiboAccountStatus,
  WeiboSearchTaskStatus,
  WeiboSearchType,
  WeiboCrawlMode
} from '@pro/types';
import {
  WeiboAccountTestDataOptions,
  WeiboSearchTaskTestDataOptions,
  TestDataError,
} from '../types/test-types.js';

/**
 * 微博测试数据工厂 - 数字化测试数据的雕塑家
 * 每一条数据都是精心雕琢的艺术品，每一个字段都有其存在的价值
 */
export class WeiboTestDataFactory {
  constructor(private readonly database: DataSource) {}

  /**
   * 创建微博账号测试数据
   * 构建具有生命力的数字身份
   */
  async createWeiboAccount(options: WeiboAccountTestDataOptions = {}): Promise<WeiboAccountEntity> {
    try {
      const account = new WeiboAccountEntity();

      // 核心身份信息 - 每个账号都有其独特的存在意义
      account.userId = options.override?.userId || faker.string.uuid();
      account.weiboUid = options.override?.weiboUid || this.generateWeiboUid();
      account.weiboNickname = options.override?.weiboNickname || faker.person.fullName();
      account.weiboAvatar = options.override?.weiboAvatar || this.generateAvatarUrl();

      // 状态管理 - 反映真实的账号生命周期
      account.status = options.status || faker.helpers.arrayElement([
        WeiboAccountStatus.ACTIVE,
        WeiboAccountStatus.INACTIVE,
        WeiboAccountStatus.SUSPENDED,
        WeiboAccountStatus.EXPIRED
      ]);

      // 认证信息 - 模拟真实的登录状态
      if (options.withCookies !== false) {
        account.cookies = options.override?.cookies || this.generateMockCookies();
      }

      // 健康状态 - 体现账号的可用性
      const isHealthy = options.isHealthy ?? faker.datatype.boolean({ probability: 0.8 });
      if (!isHealthy) {
        account.lastCheckAt = faker.date.recent({ days: 7 });
      }

      // 时间戳 - 记录账号的生命历程
      const createdAt = options.override?.createdAt || faker.date.past({ years: 2 });
      (account as any).createdAt = createdAt;
      (account as any).updatedAt = options.override?.updatedAt || faker.date.between({
        from: createdAt,
        to: new Date()
      });

      // 应用覆盖选项
      if (options.override) {
        Object.assign(account, options.override);
      }

      // 保存到数据库
      if (options.save !== false) {
        const repository = this.database.getRepository(WeiboAccountEntity);
        return await repository.save(account);
      }

      return account;
    } catch (error) {
      throw new TestDataError('创建微博账号测试数据失败', { options, error });
    }
  }

  /**
   * 创建多个微博账号测试数据
   */
  async createWeiboAccounts(
    count: number,
    options: Omit<WeiboAccountTestDataOptions, 'count'> = {}
  ): Promise<WeiboAccountEntity[]> {
    const accounts: WeiboAccountEntity[] = [];

    for (let i = 0; i < count; i++) {
      const accountOptions = {
        ...options,
        override: {
          ...options.override,
          // 确保每个账号有唯一性
          weiboUid: options.override?.weiboUid || this.generateWeiboUid(),
          userId: options.override?.userId || faker.string.uuid(),
        }
      };

      accounts.push(await this.createWeiboAccount(accountOptions));
    }

    return accounts;
  }

  /**
   * 创建微博搜索任务测试数据
   * 构建具有目的性的数据采集任务
   */
  async createWeiboSearchTask(options: WeiboSearchTaskTestDataOptions = {}): Promise<WeiboSearchTaskEntity> {
    try {
      const task = new WeiboSearchTaskEntity();

      // 任务核心 - 定义搜索的目标和范围
      task.keyword = options.override?.keyword || this.generateKeyword();
      task.startDate = options.override?.startDate || faker.date.past({ years: 1 });

      // 时间配置 - 定义数据采集的时间策略
      task.crawlInterval = options.override?.crawlInterval || faker.helpers.arrayElement([
        '30m', '1h', '2h', '6h', '12h', '1d'
      ]);

      // 进度管理 - 反映任务的执行状态
      task.progress = options.override?.progress || faker.number.int({ min: 0, max: 100 });
      task.totalSegments = options.override?.totalSegments || faker.number.int({ min: 10, max: 1000 });
      task.noDataCount = options.override?.noDataCount || faker.number.int({ min: 0, max: 10 });
      task.noDataThreshold = options.override?.noDataThreshold || 3;
      task.retryCount = options.override?.retryCount || faker.number.int({ min: 0, max: 3 });
      task.maxRetries = options.override?.maxRetries || 3;

      // 状态管理 - 体现任务的生命周期
      task.status = options.status || faker.helpers.arrayElement([
        WeiboSearchTaskStatus.PENDING,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.PAUSED,
        WeiboSearchTaskStatus.FAILED,
        WeiboSearchTaskStatus.TIMEOUT
      ]);
      task.enabled = options.enabled ?? faker.datatype.boolean({ probability: 0.9 });

      // 账号配置 - 定义使用的微博账号策略
      if (options.withAccount && !options.override?.weiboAccountId) {
        const account = await this.createWeiboAccount({ save: true });
        task.weiboAccountId = account.id;
        task.enableAccountRotation = options.override?.enableAccountRotation ?? false;
      } else {
        task.weiboAccountId = options.override?.weiboAccountId;
        task.enableAccountRotation = options.override?.enableAccountRotation ?? faker.datatype.boolean({ probability: 0.3 });
      }

      // 地理位置配置 - 为搜索添加地理维度
      if (options.withLocation) {
        task.longitude = options.override?.longitude || faker.location.longitude({ min: -180, max: 180 });
        task.latitude = options.override?.latitude || faker.location.latitude({ min: -90, max: 90 });
        task.locationAddress = options.override?.locationAddress || faker.location.streetAddress();
        task.locationName = options.override?.locationName || faker.location.city();
      }

      // 时间游标 - 管理数据采集的进度
      if (faker.datatype.boolean({ probability: 0.6 })) {
        task.currentCrawlTime = faker.date.between({
          from: task.startDate,
          to: new Date()
        });
      }

      if (faker.datatype.boolean({ probability: 0.4 })) {
        task.latestCrawlTime = faker.date.recent({ days: 7 });
      }

      // 下次执行时间 - 决定任务的调度
      if (task.enabled && task.status === WeiboSearchTaskStatus.PENDING) {
        task.nextRunAt = faker.date.future({ years: 0.01, refDate: new Date() });
      }

      // 错误信息 - 模拟真实的执行错误
      if (task.status === WeiboSearchTaskStatus.FAILED && !options.override?.errorMessage) {
        task.errorMessage = this.generateErrorMessage();
      }

      // 用户关联
      task.userId = options.override?.userId || faker.string.uuid();

      // 时间戳 - 记录任务的生命历程
      const createdAt = options.override?.createdAt || faker.date.past({ years: 1 });
      (task as any).createdAt = createdAt;
      (task as any).updatedAt = options.override?.updatedAt || faker.date.between({
        from: createdAt,
        to: new Date()
      });

      // 应用覆盖选项
      if (options.override) {
        Object.assign(task, options.override);
      }

      // 保存到数据库
      if (options.save !== false) {
        const repository = this.database.getRepository(WeiboSearchTaskEntity);
        return await repository.save(task);
      }

      return task;
    } catch (error) {
      throw new TestDataError('创建微博搜索任务测试数据失败', { options, error });
    }
  }

  /**
   * 创建多个微博搜索任务测试数据
   */
  async createWeiboSearchTasks(
    count: number,
    options: Omit<WeiboSearchTaskTestDataOptions, 'count'> = {}
  ): Promise<WeiboSearchTaskEntity[]> {
    const tasks: WeiboSearchTaskEntity[] = [];

    for (let i = 0; i < count; i++) {
      const taskOptions = {
        ...options,
        override: {
          ...options.override,
          // 确保每个任务有关键词唯一性
          keyword: options.override?.keyword || this.generateKeyword(),
        }
      };

      tasks.push(await this.createWeiboSearchTask(taskOptions));
    }

    return tasks;
  }

  /**
   * 创建原始数据测试数据
   * 模拟从微博平台获取的原始数据结构
   */
  createRawWeiboData(overrides: any = {}): any {
    const baseData = {
      id: faker.string.alphanumeric({ length: 19 }),
      mid: faker.string.alphanumeric({ length: 19 }),
      text: faker.lorem.paragraphs({ min: 1, max: 3 }),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      source: faker.helpers.arrayElement([
        'iPhone客户端',
        'Android客户端',
        '微博网页版',
        'iPad客户端'
      ]),
      user: {
        id: faker.number.int({ min: 1000000000, max: 9999999999 }).toString(),
        screen_name: faker.person.fullName(),
        profile_image_url: this.generateAvatarUrl(),
        followers_count: faker.number.int({ min: 10, max: 1000000 }),
        friends_count: faker.number.int({ min: 10, max: 10000 }),
        statuses_count: faker.number.int({ min: 10, max: 100000 }),
        verified: faker.datatype.boolean({ probability: 0.1 }),
        verified_type: faker.number.int({ min: 0, max: 8 }),
      },
      reposts_count: faker.number.int({ min: 0, max: 10000 }),
      comments_count: faker.number.int({ min: 0, max: 5000 }),
      attitudes_count: faker.number.int({ min: 0, max: 20000 }),
      isLongText: faker.datatype.boolean({ probability: 0.1 }),
      pic_urls: faker.datatype.boolean({ probability: 0.3 })
        ? Array.from({ length: faker.number.int({ min: 1, max: 9 }) }, () => ({
            thumbnail_pic: faker.image.url(),
            bmiddle_pic: faker.image.url(),
            original_pic: faker.image.url(),
          }))
        : [],
      geo: faker.datatype.boolean({ probability: 0.2 })
        ? {
            coordinates: [faker.location.longitude(), faker.location.latitude()],
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            province: faker.location.state(),
          }
        : null,
      ...overrides
    };

    return baseData;
  }

  /**
   * 生成微博UID
   * 创建符合微博平台规则的唯一标识符
   */
  private generateWeiboUid(): string {
    return faker.number.int({ min: 1000000000, max: 9999999999 }).toString();
  }

  /**
   * 生成头像URL
   */
  private generateAvatarUrl(): string {
    return faker.image.avatar();
  }

  /**
   * 生成模拟Cookies
   * 创建看起来真实的登录凭证
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
   * 生成关键词
   * 创建有意义的搜索关键词
   */
  private generateKeyword(): string {
    const categories = [
      // 热点话题
      ['人工智能', '机器学习', '深度学习', '大模型'],
      // 生活话题
      ['美食', '旅游', '摄影', '健身'],
      // 科技话题
      ['iPhone', 'Android', '5G', '区块链'],
      // 娱乐话题
      ['电影', '音乐', '游戏', '综艺'],
      // 社会话题
      ['环保', '教育', '健康', '就业'],
    ];

    const category = faker.helpers.arrayElement(categories);
    return faker.helpers.arrayElement(category);
  }

  /**
   * 生成错误信息
   */
  private generateErrorMessage(): string {
    const errors = [
      '网络连接超时',
      '账号登录状态失效',
      '请求频率过高，请稍后重试',
      '目标页面不存在',
      '数据解析失败',
      '反爬虫机制触发',
      '代理服务器连接失败',
    ];

    return faker.helpers.arrayElement(errors);
  }
}