import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { Subject, Observable } from 'rxjs';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';

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
  timer: NodeJS.Timeout;
}

/**
 * 微博登录认证服务
 * 使用 Playwright 控制浏览器完成扫码登录流程
 */
@Injectable()
export class WeiboAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeiboAuthService.name);
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
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
  ) {}

  /**
   * 模块初始化时启动浏览器实例
   */
  async onModuleInit() {
    try {
      this.logger.log('正在启动 Playwright 浏览器实例...');
      this.browser = await chromium.launch({
        headless: true, // 生产环境使用无头模式
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Playwright 浏览器启动成功');
    } catch (error) {
      this.logger.error('Playwright 浏览器启动失败', error);
      throw error;
    }
  }

  /**
   * 模块销毁时关闭浏览器实例和所有会话
   */
  async onModuleDestroy() {
    this.logger.log('正在关闭所有登录会话...');

    // 关闭所有活动会话
    for (const [sessionId, session] of this.loginSessions.entries()) {
      await this.cleanupSession(sessionId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Playwright 浏览器已关闭');
    }
  }

  /**
   * 启动微博登录流程
   * @param userId 用户 ID
   * @returns Observable 事件流
   */
  async startLogin(userId: string): Promise<Observable<WeiboLoginEvent>> {
    const sessionId = `${userId}_${Date.now()}`;
    this.logger.log(`启动微博登录会话: ${sessionId}`);

    // 创建新的浏览器上下文
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const subject = new Subject<WeiboLoginEvent>();

    // 设置超时清理定时器
    const timer = setTimeout(() => {
      this.logger.warn(`登录会话超时: ${sessionId}`);
      subject.next({
        type: 'error',
        data: { message: '登录超时,请重新尝试' },
      });
      subject.complete();
      this.cleanupSession(sessionId);
    }, this.SESSION_TIMEOUT);

    // 保存会话
    this.loginSessions.set(sessionId, { context, page, subject, timer });

    // 设置 Response 监听器
    this.setupResponseListeners(page, subject, sessionId, userId);

    // 设置页面导航监听器
    this.setupNavigationListeners(page, context, subject, sessionId, userId);

    try {
      // 导航到微博登录页面
      await page.goto(this.WEIBO_LOGIN_URL, { waitUntil: 'networkidle' });
      this.logger.log(`已打开微博登录页面: ${sessionId}`);
    } catch (error) {
      this.logger.error(`打开微博登录页面失败: ${sessionId}`, error);
      subject.next({
        type: 'error',
        data: { message: '打开登录页面失败' },
      });
      subject.complete();
      await this.cleanupSession(sessionId);
    }

    return subject.asObservable();
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
          this.logger.log(`二维码已生成: ${sessionId}, qrid: ${data.data?.qrid}`);

          subject.next({
            type: 'qrcode',
            data: {
              qrid: data.data.qrid,
              image: data.data.image,
            },
          });
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
              this.logger.log(`已扫码,等待确认: ${sessionId}`);
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
        this.logger.log(`登录成功,正在提取 Cookie 和用户信息: ${sessionId}`);

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

          this.logger.log(`微博账号保存成功: ${sessionId}, accountId: ${account.id}`);

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

    const userInfo = await page.evaluate(() => {
      const config = (window as any).$CONFIG;
      return {
        id: config?.user?.id,
        idstr: config?.user?.idstr,
        screen_name: config?.user?.screen_name,
        avatar_hd: config?.user?.avatar_hd,
      };
    });

    if (!userInfo.id) {
      throw new Error('无法从 window.$CONFIG.user 提取用户信息');
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
    this.logger.log(`保存微博账号: userId=${userId}, weiboUid=${userInfo.uid}`);

    // 检查是否已存在
    const existing = await this.weiboAccountRepo.findOne({
      where: { userId, weiboUid: userInfo.uid },
    });

    if (existing) {
      // 更新现有账号
      existing.weiboNickname = userInfo.nickname;
      existing.weiboAvatar = userInfo.avatar;
      existing.cookies = JSON.stringify(cookies);
      existing.status = 'active' as any;
      existing.lastCheckAt = new Date();

      return await this.weiboAccountRepo.save(existing);
    }

    // 创建新账号
    const account = this.weiboAccountRepo.create({
      userId,
      weiboUid: userInfo.uid,
      weiboNickname: userInfo.nickname,
      weiboAvatar: userInfo.avatar,
      cookies: JSON.stringify(cookies),
      status: 'active' as any,
      lastCheckAt: new Date(),
    });

    return await this.weiboAccountRepo.save(account);
  }

  /**
   * 清理登录会话
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.loginSessions.get(sessionId);
    if (!session) return;

    this.logger.debug(`清理登录会话: ${sessionId}`);

    // 清除定时器
    if (session.timer) {
      clearTimeout(session.timer);
    }

    // 关闭浏览器上下文
    try {
      await session.context.close();
    } catch (error) {
      this.logger.error(`关闭浏览器上下文失败: ${sessionId}`, error);
    }

    // 移除会话
    this.loginSessions.delete(sessionId);
  }
}
