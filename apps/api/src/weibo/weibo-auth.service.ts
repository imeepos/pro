import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { Subject, Observable, Subscription } from 'rxjs';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
import { ScreensGateway } from '../screens/screens.gateway';
import { WeiboSessionStorage, SessionData } from './weibo-session-storage.service';

/**
 * SSE 消息事件类型
 */
export type WeiboLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error';

/**
 * SSE 消息事件接口
 */
export interface WeiboLoginEvent {
  type: WeiboLoginEventType;
  data: any;
}

/**
 * 微博用户信息接口
 */
interface WeiboUserInfo {
  uid: string;
  nickname: string;
  avatar: string;
}

/**
 * 登录会话接口
 */
interface LoginSession {
  context: BrowserContext;
  page: Page;
  subject: Subject<WeiboLoginEvent>;
  timer?: NodeJS.Timeout;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastEvent?: WeiboLoginEvent;
  eventsSubscription?: Subscription;
}

export interface WeiboLoginSessionSnapshot {
  sessionId: string;
  userId: string;
  lastEvent?: WeiboLoginEvent;
  expiresAt: Date;
  isExpired: boolean;
  status: 'active' | 'expired' | 'completed';
}

/**
 * 微博登录认证服务
 * 使用 Playwright 控制浏览器完成扫码登录流程
 */
@Injectable()
export class WeiboAuthService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private loginSessions = new Map<string, LoginSession>();

  // 登录会话超时时间 (5分钟)
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000;

  // 微博登录页面 URL
  private readonly WEIBO_LOGIN_URL =
    'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup' +
    '&url=https%3A%2F%2Fweibo.com%2Fnewlogin%3Ftabtype%3Dweibo%26gid%3D102803%26openLoginLayer%3D0%26url%3Dhttps%253A%252F%252Fweibo.com%252F' +
    '&from=weibopro';

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    @Inject(forwardRef(() => ScreensGateway))
    private readonly screensGateway: ScreensGateway,
    private readonly sessionStorage: WeiboSessionStorage,
  ) {
    this.logger.setContext(WeiboAuthService.name);
  }

  /**
   * 模块初始化时启动浏览器实例
   */
  async onModuleInit() {
    try {
      this.logger.info('正在启动 Playwright 浏览器实例...');
      this.browser = await chromium.launch({
        headless: true, // 生产环境使用无头模式
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.info('Playwright 浏览器启动成功');

      // 清理可能存在的过期会话
      await this.cleanupOrphanedSessions();
    } catch (error) {
      this.logger.warn('Playwright 浏览器启动失败，微博登录功能将不可用', error.message);
      this.browser = null;
    }
  }

  /**
   * 模块销毁时关闭浏览器实例和所有会话
   */
  async onModuleDestroy() {
    this.logger.info('正在关闭所有登录会话...');

    // 关闭所有活动会话
    for (const [sessionId, session] of this.loginSessions.entries()) {
      await this.cleanupSession(sessionId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.logger.info('Playwright 浏览器已关闭');
    }
  }

  /**
   * 启动微博登录流程
   * @param userId 用户 ID
   * @returns Observable 事件流
   */
  async startLogin(userId: string): Promise<Observable<WeiboLoginEvent>> {
    try {
      const { events$ } = await this.createLoginSession(userId);
      return events$;
    } catch (error) {
      const subject = new Subject<WeiboLoginEvent>();
      subject.next({
        type: 'error',
        data: { message: error?.message || '微博登录暂时不可用' },
      });
      subject.complete();
      return subject.asObservable();
    }
  }

  async createLoginSession(
    userId: string,
  ): Promise<{ sessionId: string; expiresAt: Date; events$: Observable<WeiboLoginEvent> }> {
    if (!this.browser) {
      this.logger.warn('Playwright 浏览器未就绪，拒绝创建微博登录会话');
      throw new ServiceUnavailableException('Playwright浏览器未就绪，微博登录功能暂时不可用');
    }

    // 首先在 Redis 中创建会话记录
    const sessionData = await this.sessionStorage.createSession(userId, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const { sessionId, expiresAt } = sessionData;
    this.logger.info(`启动微博登录会话: ${sessionId}`, { userId, expiresAt });

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const subject = new Subject<WeiboLoginEvent>();
    const createdAt = new Date();

    const session: LoginSession = {
      context,
      page,
      subject,
      userId,
      createdAt,
      expiresAt,
    };

    // 订阅事件并同步到 Redis
    session.eventsSubscription = subject.subscribe({
      next: async (event) => {
        session.lastEvent = event;

        // 通过WebSocket广播事件给前端
        this.broadcastLoginEvent(sessionId, userId, event);

        // 同步事件到 Redis
        await this.sessionStorage.updateSessionEvent(sessionId, event).catch(error => {
          this.logger.error('同步会话事件到Redis失败', { sessionId, error });
        });
      },
      error: async (error) => {
        this.logger.error('会话事件流错误', { sessionId, error });

        // 广播错误事件
        this.broadcastLoginEvent(sessionId, userId, {
          type: 'error',
          data: { message: '登录会话发生错误', error: error.message }
        });

        await this.sessionStorage.updateSessionStatus(sessionId, 'expired');
      },
      complete: async () => {
        this.logger.debug('会话事件流完成', { sessionId });
        await this.sessionStorage.updateSessionStatus(sessionId, 'completed');
      }
    });

    this.loginSessions.set(sessionId, session);

    const timer = setTimeout(() => {
      this.logger.warn(`登录会话超时: ${sessionId}`);
      subject.next({
        type: 'error',
        data: { message: '登录超时,请重新尝试' },
      });
      subject.complete();
      this.cleanupSession(sessionId);
    }, this.SESSION_TIMEOUT);

    session.timer = timer;

    this.setupResponseListeners(page, subject, sessionId, userId);
    this.setupNavigationListeners(page, context, subject, sessionId, userId);

    setImmediate(async () => {
      try {
        await page.goto(this.WEIBO_LOGIN_URL, { waitUntil: 'networkidle' });
        this.logger.info(`已打开微博登录页面: ${sessionId}`);

        try {
          await page.waitForSelector('img[src*="qrcode"]', { timeout: 10000 });
          this.logger.info(`二维码元素已加载: ${sessionId}`);
        } catch (e) {
          this.logger.warn(`等待二维码元素超时: ${sessionId}`);
        }
      } catch (error) {
        this.logger.error(`打开微博登录页面失败: ${sessionId}`, error);
        subject.next({
          type: 'error',
          data: { message: '打开登录页面失败' },
        });
        subject.complete();
        await this.cleanupSession(sessionId);
      }
    });

    return {
      sessionId,
      expiresAt,
      events$: subject.asObservable(),
    };
  }

  async getLoginSessionSnapshot(sessionId: string): Promise<WeiboLoginSessionSnapshot> {
    // 首先从 Redis 获取会话数据
    const sessionData = await this.sessionStorage.getSession(sessionId);

    if (!sessionData) {
      throw new NotFoundException('登录会话不存在或已结束');
    }

    // 然后从内存获取实时状态
    const memorySession = this.loginSessions.get(sessionId);
    const isExpired = Date.now() >= sessionData.expiresAt.getTime();

    return {
      sessionId,
      userId: sessionData.userId,
      lastEvent: memorySession?.lastEvent || sessionData.lastEvent,
      expiresAt: sessionData.expiresAt,
      isExpired,
      status: sessionData.status,
    };
  }

  observeLoginSession(sessionId: string): Observable<WeiboLoginEvent> {
    const session = this.loginSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('登录会话不存在或已结束');
    }

    // 检查会话是否已过期
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('登录会话已过期');
    }

    // 检查Subject是否已关闭
    if (session.subject.closed) {
      throw new NotFoundException('登录会话事件流已关闭');
    }

    return new Observable<WeiboLoginEvent>(subscriber => {
      // 立即检查会话状态
      const currentSession = this.loginSessions.get(sessionId);
      if (!currentSession) {
        subscriber.error(new NotFoundException('登录会话不存在或已结束'));
        return;
      }

      if (currentSession.subject.closed) {
        subscriber.error(new NotFoundException('登录会话事件流已关闭'));
        return;
      }

      // 订阅会话的Subject
      const subscription = currentSession.subject.subscribe({
        next: (event) => {
          try {
            subscriber.next(event);
          } catch (error) {
            this.logger.error('推送登录事件到订阅者失败', { sessionId, error });
          }
        },
        error: (error) => {
          this.logger.error('会话Subject发生错误', { sessionId, error });
          subscriber.error(error);
        },
        complete: () => {
          this.logger.debug('会话Subject完成', { sessionId });
          subscriber.complete();
        }
      });

      // 清理函数
      return () => {
        if (!subscription.closed) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * 设置 Response 监听器
   * 监听二维码生成和状态检查接口
   */
  private setupResponseListeners(
    page: Page,
    subject: Subject<WeiboLoginEvent>,
    sessionId: string,
    userId: string,
  ) {
    page.on('response', async (response) => {
      const url = response.url();

      try {
        // 监听二维码生成接口
        if (url.includes('qrcode/image')) {
          const data = await response.json();
          this.logger.info(`[二维码接口] 响应数据: ${JSON.stringify(data)}, session: ${sessionId}`);

          if (data.data?.image) {
            subject.next({
              type: 'qrcode',
              data: {
                qrid: data.data.qrid,
                image: data.data.image,
              },
            });
            this.logger.info(`[二维码] 已推送给前端: ${data.data.image}`);
          } else {
            this.logger.error(`[二维码接口] 缺少 image 字段: ${JSON.stringify(data)}`);
          }
        }

        // 监听状态检查接口
        if (url.includes('qrcode/check')) {
          try {
            const data = await response.json();

            // 推送状态事件
            subject.next({
              type: 'status',
              data: {
                retcode: data.retcode,
                msg: data.msg,
                data: data.data,
              },
            });

            // 50114001: 未使用 (等待扫码)
            if (data.retcode === 50114001) {
              this.logger.debug(`等待扫码: ${sessionId}`);
            }

            // 50114002: 已扫码,等待手机确认
            else if (data.retcode === 50114002) {
              this.logger.info(`已扫码,等待确认: ${sessionId}`);
              subject.next({
                type: 'scanned',
                data: { message: '成功扫描,请在手机点击确认以登录' },
              });
            }

            // 50114003: 二维码过期
            else if (data.retcode === 50114003) {
              this.logger.warn(`二维码已过期: ${sessionId}`);
              subject.next({
                type: 'expired',
                data: { message: '该二维码已过期,请重新扫描' },
              });
              subject.complete();
              await this.cleanupSession(sessionId);
            }
          } catch (e) {
            // 响应为空或无法解析,可能是登录成功后的空响应
            this.logger.debug(`Check 接口响应为空或无法解析: ${sessionId}`);
          }
        }
      } catch (error) {
        this.logger.error(`处理响应失败: ${url}`, error);
      }
    });
  }

  /**
   * 设置页面导航监听器
   * 检测登录成功后的页面跳转
   */
  private setupNavigationListeners(
    page: Page,
    context: BrowserContext,
    subject: Subject<WeiboLoginEvent>,
    sessionId: string,
    userId: string,
  ) {
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;

      const url = frame.url();
      this.logger.debug(`页面导航: ${url}, session: ${sessionId}`);

      // 检测登录成功: 页面跳转到微博首页
      if (url.startsWith('https://weibo.com/')) {
        this.logger.info(`登录成功,正在提取 Cookie 和用户信息: ${sessionId}`);

        try {
          // 提取 Cookie
          const cookies = await context.cookies();

          // 提取用户信息
          const userInfo = await this.extractUserInfo(page);

          // 保存到数据库
          const account = await this.saveAccount(userId, cookies, userInfo);

          // 推送成功事件
          subject.next({
            type: 'success',
            data: {
              accountId: account.id,
              weiboUid: account.weiboUid,
              weiboNickname: account.weiboNickname,
              weiboAvatar: account.weiboAvatar,
            },
          });

          this.logger.info(`微博账号保存成功: ${sessionId}, accountId: ${account.id}`);

          subject.complete();
          await this.cleanupSession(sessionId);
        } catch (error) {
          this.logger.error(`处理登录成功失败: ${sessionId}`, error);
          subject.next({
            type: 'error',
            data: { message: '保存账号信息失败' },
          });
          subject.complete();
          await this.cleanupSession(sessionId);
        }
      }
    });
  }

  /**
   * 从页面提取微博用户信息
   * 从 window.$CONFIG.user 获取用户数据
   */
  private async extractUserInfo(page: Page): Promise<WeiboUserInfo> {
    this.logger.debug('正在提取微博用户信息...');

    // 等待页面完全加载
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      this.logger.warn('等待页面 networkidle 超时');
    });

    // 等待一小段时间让 JS 执行
    await page.waitForTimeout(2000);

    // 尝试多种方式获取用户信息
    const userInfo = await page.evaluate(() => {
      type WeiboUserSnapshot = {
        id?: number;
        idstr?: string;
        screen_name?: string;
        avatar_hd?: string;
      };

      type WeiboGlobal = typeof window & {
        $CONFIG?: { user?: WeiboUserSnapshot };
        $render_data?: { user?: WeiboUserSnapshot };
      };

      const globalWindow = window as WeiboGlobal;

      // 方式1: window.$CONFIG
      const config = globalWindow.$CONFIG;
      if (config?.user?.id) {
        return {
          id: config.user.id,
          idstr: config.user.idstr,
          screen_name: config.user.screen_name,
          avatar_hd: config.user.avatar_hd,
          source: '$CONFIG'
        };
      }

      // 方式2: window.$render_data
      const renderData = globalWindow.$render_data;
      if (renderData?.user?.id) {
        return {
          id: renderData.user.id,
          idstr: renderData.user.idstr,
          screen_name: renderData.user.screen_name,
          avatar_hd: renderData.user.avatar_hd,
          source: '$render_data'
        };
      }

      // 方式3: localStorage
      try {
        const storageUser = localStorage.getItem('weiboUserInfo');
        if (storageUser) {
          const user = JSON.parse(storageUser);
          if (user.id) {
            return {
              id: user.id,
              idstr: user.idstr,
              screen_name: user.screen_name,
              avatar_hd: user.avatar_hd,
              source: 'localStorage'
            };
          }
        }
      } catch (e) {}

      // 方式4: 从页面元素提取
      const avatarImg = document.querySelector('[class*="AvatarImg"]') as HTMLImageElement;
      const nicknameEl = document.querySelector('[class*="nick_name"]');

      return {
        id: null,
        idstr: null,
        screen_name: nicknameEl?.textContent || null,
        avatar_hd: avatarImg?.src || null,
        source: 'dom',
        debug: {
          hasConfig: Boolean(globalWindow.$CONFIG),
          hasRenderData: Boolean(globalWindow.$render_data),
          configKeys: globalWindow.$CONFIG ? Object.keys(globalWindow.$CONFIG) : [],
          renderDataKeys: globalWindow.$render_data ? Object.keys(globalWindow.$render_data) : []
        }
      };
    });

    this.logger.info(`用户信息提取结果: ${JSON.stringify(userInfo)}`);

    if (!userInfo.id) {
      // 记录页面 HTML 用于调试
      const html = await page.content();
      this.logger.debug(`页面HTML前1000字符: ${html.substring(0, 1000)}`);
      throw new Error(`无法提取用户信息，调试信息: ${JSON.stringify(userInfo.debug || {})}`);
    }

    return {
      uid: userInfo.idstr || userInfo.id.toString(),
      nickname: userInfo.screen_name || `微博用户_${userInfo.idstr}`,
      avatar: userInfo.avatar_hd || '',
    };
  }

  /**
   * 保存微博账号到数据库
   */
  private async saveAccount(
    userId: string,
    cookies: Cookie[],
    userInfo: WeiboUserInfo,
  ): Promise<WeiboAccountEntity> {
    this.logger.info(`保存微博账号: userId=${userId}, weiboUid=${userInfo.uid}`);

    // 检查是否已存在
    const existing = await this.weiboAccountRepo.findOne({
      where: { userId, weiboUid: userInfo.uid },
    });

    let savedAccount: WeiboAccountEntity;

    if (existing) {
      // 更新现有账号
      existing.weiboNickname = userInfo.nickname;
      existing.weiboAvatar = userInfo.avatar;
      existing.cookies = JSON.stringify(cookies);
      existing.status = WeiboAccountStatus.ACTIVE;
      existing.lastCheckAt = new Date();

      savedAccount = await this.weiboAccountRepo.save(existing);
    } else {
      // 创建新账号
      const account = this.weiboAccountRepo.create({
        userId,
        weiboUid: userInfo.uid,
        weiboNickname: userInfo.nickname,
        weiboAvatar: userInfo.avatar,
        cookies: JSON.stringify(cookies),
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
      });

      savedAccount = await this.weiboAccountRepo.save(account);
    }

    // 推送微博用户统计更新
    await this.notifyWeiboStatsUpdate();

    return savedAccount;
  }

  /**
   * 清理登录会话
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.loginSessions.get(sessionId);
    if (!session) return;

    this.logger.debug(`清理登录会话: ${sessionId}`);

    // 先从Map中移除，防止新的订阅
    this.loginSessions.delete(sessionId);

    // 清除定时器
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }

    // 清理内部事件订阅
    try {
      session.eventsSubscription?.unsubscribe();
    } catch (error) {
      this.logger.error(`清理内部事件订阅失败: ${sessionId}`, error);
    }

    // 最后才关闭Subject，确保所有事件都能推送完
    try {
      if (!session.subject.closed) {
        // 推送一个会话结束事件
        session.subject.next({
          type: 'expired',
          data: { message: '登录会话已结束' }
        });

        // 延迟一点时间再关闭，确保事件被推送
        setTimeout(() => {
          if (!session.subject.closed) {
            session.subject.complete();
          }
        }, 100);
      }
    } catch (error) {
      this.logger.error(`关闭Subject失败: ${sessionId}`, error);
    }

    // 关闭浏览器上下文
    try {
      await session.context.close();
    } catch (error) {
      this.logger.error(`关闭浏览器上下文失败: ${sessionId}`, error);
    }

    // 更新 Redis 中的会话状态
    try {
      await this.sessionStorage.updateSessionStatus(sessionId, 'completed');
    } catch (error) {
      this.logger.error(`更新Redis会话状态失败: ${sessionId}`, error);
    }
  }

  /**
   * 推送微博用户统计更新
   * 在账号数据变化时主动推送最新统计
   */
  private async notifyWeiboStatsUpdate() {
    try {
      // 获取微博用户统计
      const total = await this.weiboAccountRepo.count();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayNew = await this.weiboAccountRepo.count({
        where: {
          createdAt: MoreThanOrEqual(today),
        },
      });

      const online = await this.weiboAccountRepo.count({
        where: {
          status: WeiboAccountStatus.ACTIVE,
        },
      });

      const stats = { total, todayNew, online };
      this.screensGateway.broadcastWeiboLoggedInUsersUpdate(stats);
    } catch (error) {
      this.logger.error('推送微博用户统计更新失败:', error);
    }
  }

  /**
   * 清理孤立的会话（服务重启后存在于Redis但内存中不存在的会话）
   */
  private async cleanupOrphanedSessions(): Promise<void> {
    try {
      const stats = await this.sessionStorage.getStats();
      if (stats.active > 0) {
        this.logger.info('发现活跃会话，标记为过期（可能是服务重启）', {
          activeCount: stats.active
        });

        // 这里我们只记录，不实际清理，因为这些会话可能还在其他服务实例中运行
        // 在实际部署中，可能需要更复杂的分布式会话管理
      }
    } catch (error) {
      this.logger.error('清理孤立会话失败', error);
    }
  }

  /**
   * 获取服务会话统计信息
   */
  async getServiceStats(): Promise<{
    memorySessions: number;
    redisStats: any;
  }> {
    return {
      memorySessions: this.loginSessions.size,
      redisStats: await this.sessionStorage.getStats(),
    };
  }

  /**
   * 通过WebSocket广播登录事件
   */
  private broadcastLoginEvent(sessionId: string, userId: string, event: WeiboLoginEvent): void {
    try {
      const eventData = {
        sessionId,
        userId,
        type: event.type,
        data: event.data,
        timestamp: new Date().toISOString()
      };

      // 通过ScreensGateway广播事件
      this.screensGateway.sendToUser(userId, 'weibo:login:event', eventData);

      // 特殊处理一些关键事件
      switch (event.type) {
        case 'qrcode':
          this.logger.info(`[WebSocket] 二维码事件已广播: ${sessionId}`);
          break;
        case 'scanned':
          this.logger.info(`[WebSocket] 扫码事件已广播: ${sessionId}`);
          break;
        case 'success':
          this.logger.info(`[WebSocket] 登录成功事件已广播: ${sessionId}`);
          break;
        case 'error':
          this.logger.error(`[WebSocket] 登录错误事件已广播: ${sessionId}`, event.data);
          break;
        case 'expired':
          this.logger.warn(`[WebSocket] 登录过期事件已广播: ${sessionId}`);
          break;
      }

    } catch (error) {
      this.logger.error(`[WebSocket] 广播登录事件失败: ${sessionId}`, error);
    }
  }

  /**
   * 获取WebSocket连接统计
   */
  getWebSocketStats(): any {
    try {
      return this.screensGateway.getConnectionStats();
    } catch (error) {
      this.logger.error('获取WebSocket统计信息失败', error);
      return {
        totalConnections: 0,
        connectionsByUser: [],
        averageConnectionDuration: 0
      };
    }
  }

  /**
   * 检查WebSocket连接健康状态
   */
  async checkWebSocketHealth(): Promise<void> {
    try {
      const stats = this.getWebSocketStats();
      this.logger.info('WebSocket连接健康检查', stats);

      if (stats.totalConnections === 0) {
        this.logger.warn('没有活跃的WebSocket连接，可能影响登录体验');
      }

    } catch (error) {
      this.logger.error('WebSocket健康检查失败', error);
    }
  }

  /**
   * 向特定用户发送WebSocket消息
   */
  sendToUser(userId: string, event: string, data: any): boolean {
    try {
      return this.screensGateway.sendToUser(userId, event, data);
    } catch (error) {
      this.logger.error(`发送WebSocket消息失败: userId=${userId}, event=${event}`, error);
      return false;
    }
  }

  /**
   * 广播微博登录状态更新
   */
  broadcastLoginStatusUpdate(sessionId: string, status: {
    isOnline: boolean;
    totalAccounts: number;
    activeAccounts: number;
  }): void {
    try {
      const session = this.loginSessions.get(sessionId);
      if (session) {
        this.screensGateway.sendToUser(session.userId, 'weibo:status:update', {
          sessionId,
          ...status,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.logger.error(`广播登录状态更新失败: ${sessionId}`, error);
    }
  }
}
