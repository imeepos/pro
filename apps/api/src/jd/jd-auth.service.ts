import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { Subject, Observable } from 'rxjs';
import { JdAccountEntity } from '@pro/entities';
import { JdAccountService } from './jd-account.service';

/**
 * SSE 消息事件类型
 */
export type JdLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error';

/**
 * SSE 消息事件接口
 */
export interface JdLoginEvent {
  type: JdLoginEventType;
  data: any;
}

/**
 * 京东用户信息接口
 */
interface JdUserInfo {
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
  subject: Subject<JdLoginEvent>;
  timer: NodeJS.Timeout;
}

/**
 * 京东登录认证服务
 * 使用 Playwright 控制浏览器完成扫码登录流程
 */
@Injectable()
export class JdAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JdAuthService.name);
  private browser: Browser;
  private loginSessions = new Map<string, LoginSession>();

  // 登录会话超时时间 (5分钟)
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000;

  // 京东登录页面 URL
  private readonly JD_LOGIN_URL = 'https://passport.jd.com/new/login.aspx?ReturnUrl=https%3A%2F%2Fhk.jd.com%2F';

  // 二维码检查接口
  private readonly JD_QR_CHECK_URL = 'https://qr.m.jd.com/check';

  constructor(
    private readonly jdAccountService: JdAccountService,
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
      this.logger.warn('Playwright 浏览器启动失败，京东登录功能将不可用', error.message);
      this.browser = null;
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
   * 启动京东登录流程
   * @param userId 用户 ID
   * @returns Observable 事件流
   */
  async startLogin(userId: string): Promise<Observable<JdLoginEvent>> {
    const sessionId = `${userId}_${Date.now()}`;
    this.logger.log(`启动京东登录会话: ${sessionId}`);

    // 检查浏览器是否可用
    if (!this.browser) {
      const subject = new Subject<JdLoginEvent>();
      subject.next({
        type: 'error',
        data: { message: 'Playwright浏览器未就绪，京东登录功能暂时不可用' },
      });
      subject.complete();
      return subject.asObservable();
    }

    // 创建新的浏览器上下文
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const subject = new Subject<JdLoginEvent>();

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

    // 先设置监听器
    this.setupQrCodeListener(page, subject, sessionId);
    this.setupQrStatusMonitor(page, context, subject, sessionId, userId);

    // 异步启动页面导航（在 SSE 连接建立后执行）
    setImmediate(async () => {
      try {
        // 导航到京东登录页面
        await page.goto(this.JD_LOGIN_URL, { waitUntil: 'networkidle' });
        this.logger.log(`已打开京东登录页面: ${sessionId}`);

        // 等待页面完全加载
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
          this.logger.warn(`等待页面加载超时: ${sessionId}`);
        });

        this.logger.log(`京东登录页面加载完成: ${sessionId}`);
      } catch (error) {
        this.logger.error(`打开京东登录页面失败: ${sessionId}`, error);
        subject.next({
          type: 'error',
          data: { message: '打开登录页面失败' },
        });
        subject.complete();
        await this.cleanupSession(sessionId);
      }
    });

    return subject.asObservable();
  }

  /**
   * 设置二维码监听器
   * 监听二维码生成接口并提取二维码图片
   */
  private setupQrCodeListener(
    page: Page,
    subject: Subject<JdLoginEvent>,
    sessionId: string,
  ) {
    page.on('response', async (response) => {
      const url = response.url();

      try {
        // 监听二维码生成接口
        if (url.includes('qrcode') && url.includes('image')) {
          const buffer = await response.body();
          const base64Image = buffer.toString('base64');
          const imageData = `data:image/png;base64,${base64Image}`;

          this.logger.log(`二维码已生成: ${sessionId}`);

          subject.next({
            type: 'qrcode',
            data: {
              image: imageData,
            },
          });
        }
      } catch (error) {
        this.logger.error(`处理二维码响应失败: ${url}`, error);
      }
    });
  }

  /**
   * 设置二维码状态监控
   * 监听京东SSE推送的二维码状态变化
   */
  private async setupQrStatusMonitor(
    page: Page,
    context: BrowserContext,
    subject: Subject<JdLoginEvent>,
    sessionId: string,
    userId: string,
  ) {
    try {
      // 监听京东的状态检查接口响应
      page.on('response', async (response) => {
        const url = response.url();

        // 监听二维码状态检查接口
        if (url.includes('qr.m.jd.com/check')) {
          try {
            const text = await response.text();

            // 解析JSONP响应
            const jsonStr = text.replace(/^jQuery\d+\(/, '').replace(/\)$/, '');
            const statusData = JSON.parse(jsonStr);

            this.logger.log(`[京东状态] 响应数据: ${JSON.stringify(statusData)}, session: ${sessionId}`);

            switch (statusData.code) {
              case 201:
                // 未扫码，继续等待
                this.logger.debug(`等待扫码: ${sessionId}`);
                break;

              case 202:
                this.logger.log(`已扫码,等待确认: ${sessionId}`);
                subject.next({
                  type: 'scanned',
                  data: { message: '请手机客户端确认登录' }
                });
                break;

              case 203:
                this.logger.warn(`二维码失效: ${sessionId}`);
                subject.next({
                  type: 'expired',
                  data: { message: '二维码失效了，先刷新二维码再试试吧' }
                });
                subject.complete();
                await this.cleanupSession(sessionId);
                break;

              case 204:
                this.logger.warn(`二维码过期: ${sessionId}`);
                subject.next({
                  type: 'expired',
                  data: { message: '二维码已过期，请重新扫描' }
                });
                subject.complete();
                await this.cleanupSession(sessionId);
                break;

              case 205:
                this.logger.warn(`二维码取消授权: ${sessionId}`);
                subject.next({
                  type: 'error',
                  data: { message: '二维码已取消授权' }
                });
                subject.complete();
                await this.cleanupSession(sessionId);
                break;

              default:
                this.logger.warn(`未知状态码: ${statusData.code}, session: ${sessionId}`);
                subject.next({
                  type: 'error',
                  data: { message: statusData.msg || '未知错误' }
                });
                break;
            }
          } catch (e) {
            this.logger.debug(`状态检查接口响应解析失败: ${sessionId}`);
          }
        }
      });

      // 监听页面导航变化，检测登录成功
      page.on('framenavigated', async (frame) => {
        if (frame !== page.mainFrame()) return;

        const url = frame.url();
        this.logger.debug(`页面导航: ${url}, session: ${sessionId}`);

        // 检测登录成功：跳转到京东首页
        if (url.startsWith('https://www.jd.com/') || url.startsWith('https://hk.jd.com/')) {
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
                jdUid: account.jdUid,
                jdNickname: account.jdNickname,
                jdAvatar: account.jdAvatar,
              },
            });

            this.logger.log(`京东账号保存成功: ${sessionId}, accountId: ${account.id}`);

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

    } catch (error) {
      this.logger.error(`监听二维码状态失败: ${sessionId}`, error);
      subject.next({
        type: 'error',
        data: { message: '状态监听失败' }
      });
    }
  }

  /**
   * 从页面提取京东用户信息
   */
  private async extractUserInfo(page: Page): Promise<JdUserInfo> {
    this.logger.debug('正在提取京东用户信息...');

    // 等待页面完全加载
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      this.logger.warn('等待页面 networkidle 超时');
    });

    // 等待一小段时间让 JS 执行
    await page.waitForTimeout(2000);

    // 尝试从页面提取用户信息
    const userInfo = await page.evaluate(() => {
      // 方式1: 从页面全局变量获取
      if ((window as any).jdUserInfo) {
        const info = (window as any).jdUserInfo;
        return {
          uid: info.id || info.pin,
          nickname: info.nickname || info.pin,
          avatar: info.avatar || info.headPic,
          source: 'jdUserInfo'
        };
      }

      // 方式2: 从 localStorage 获取
      try {
        const storageUser = localStorage.getItem('pin');
        const nickname = localStorage.getItem('nickName');
        if (storageUser) {
          return {
            uid: storageUser,
            nickname: nickname || storageUser,
            avatar: '',
            source: 'localStorage'
          };
        }
      } catch (e) {}

      // 方式3: 从页面元素提取
      const nicknameEl = document.querySelector('[class*="nickname"], [class*="username"], .name');
      const avatarImg = document.querySelector('[class*="avatar"], [class*="head"], .photo img') as HTMLImageElement;

      return {
        uid: null,
        nickname: nicknameEl?.textContent?.trim() || null,
        avatar: avatarImg?.src || '',
        source: 'dom'
      };
    });

    this.logger.log(`用户信息提取结果: ${JSON.stringify(userInfo)}`);

    if (!userInfo.uid) {
      // 如果没有提取到uid，使用默认值
      this.logger.warn('无法提取用户ID，使用默认值');
      return {
        uid: `jd_${Date.now()}`,
        nickname: userInfo.nickname || `京东用户`,
        avatar: userInfo.avatar || '',
      };
    }

    return {
      uid: userInfo.uid,
      nickname: userInfo.nickname || `京东用户_${userInfo.uid}`,
      avatar: userInfo.avatar || '',
    };
  }

  /**
   * 保存京东账号到数据库
   */
  private async saveAccount(
    userId: string,
    cookies: Cookie[],
    userInfo: JdUserInfo,
  ): Promise<JdAccountEntity> {
    this.logger.log(`保存京东账号: userId=${userId}, jdUid=${userInfo.uid}`);

    // 将Cookie转换为字符串格式
    const cookieString = JSON.stringify(cookies);

    return await this.jdAccountService.saveAccount(userId, cookieString, userInfo);
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