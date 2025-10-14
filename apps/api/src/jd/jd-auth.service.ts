import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
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

  // 用户信息接口
  private readonly JD_USER_INFO_URL = 'https://passport.jd.com/user/petName/getUserInfoForMiniJd.action';

  // 页面加载配置
  private readonly PAGE_LOAD_TIMEOUT = 60000; // 60秒超时
  private readonly MAX_RETRY_ATTEMPTS = 2; // 最大重试次数

  constructor(
    private readonly jdAccountService: JdAccountService,
    private readonly httpService: HttpService,
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
    const sessionIds = Array.from(this.loginSessions.keys());
    for (const sessionId of sessionIds) {
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
      await this.navigateToLoginPageWithRetry(page, subject, sessionId);
    });

    return subject.asObservable();
  }

  /**
   * 带重试机制的页面导航方法
   * 优雅地处理网络超时、连接失败等不同错误类型
   */
  private async navigateToLoginPageWithRetry(
    page: Page,
    subject: Subject<JdLoginEvent>,
    sessionId: string,
    attempt: number = 1,
  ): Promise<void> {
    try {
      this.logger.log(`正在导航到京东登录页面 (尝试 ${attempt}/${this.MAX_RETRY_ATTEMPTS}): ${sessionId}`);

      // 使用 domcontentloaded 策略，更快且更稳定
      await page.goto(this.JD_LOGIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: this.PAGE_LOAD_TIMEOUT,
      });

      this.logger.log(`京东登录页面导航成功: ${sessionId}`);

      // 额外等待确保关键资源加载完成
      await page.waitForTimeout(2000).catch(() => {
        this.logger.debug(`页面等待超时，继续执行: ${sessionId}`);
      });

      this.logger.log(`京东登录页面准备完成: ${sessionId}`);

    } catch (error) {
      const errorMessage = this.extractPageLoadErrorMessage(error);
      this.logger.error(`页面导航失败 (尝试 ${attempt}/${this.MAX_RETRY_ATTEMPTS}): ${sessionId}`, error);

      // 判断是否应该重试
      if (attempt < this.MAX_RETRY_ATTEMPTS && this.shouldRetryPageLoad(error)) {
        this.logger.log(`准备重试页面导航: ${sessionId}`);

        // 等待一段时间后重试
        await page.waitForTimeout(3000);

        return this.navigateToLoginPageWithRetry(page, subject, sessionId, attempt + 1);
      }

      // 所有重试都失败了，发送错误事件
      this.logger.error(`页面导航最终失败: ${sessionId}`, error);
      subject.next({
        type: 'error',
        data: {
          message: errorMessage,
          attempt: attempt,
          canRetry: this.shouldRetryPageLoad(error),
        },
      });
      subject.complete();
      await this.cleanupSession(sessionId);
    }
  }

  /**
   * 提取页面加载错误的具体信息
   */
  private extractPageLoadErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return '页面加载超时，网络连接可能较慢，请检查网络状况后重试';
    }

    if (error.message?.includes('net::ERR_NAME_NOT_RESOLVED')) {
      return '无法解析域名，请检查网络连接';
    }

    if (error.message?.includes('net::ERR_CONNECTION_REFUSED')) {
      return '连接被拒绝，服务器可能暂时不可用';
    }

    if (error.message?.includes('net::ERR_INTERNET_DISCONNECTED')) {
      return '网络连接已断开，请检查网络设置';
    }

    if (error.message?.includes('Navigation aborted')) {
      return '页面导航被中断，请重试';
    }

    return `页面加载失败: ${error.message || '未知错误'}`;
  }

  /**
   * 判断是否应该重试页面加载
   */
  private shouldRetryPageLoad(error: any): boolean {
    // 网络相关错误通常可以通过重试解决
    if (error.name === 'TimeoutError') {
      return true;
    }

    // 连接相关错误
    if (error.message?.includes('net::ERR_CONNECTION') ||
        error.message?.includes('net::ERR_TIMED_OUT')) {
      return true;
    }

    // 服务器错误
    if (error.message?.includes('500') ||
        error.message?.includes('502') ||
        error.message?.includes('503') ||
        error.message?.includes('504')) {
      return true;
    }

    // 其他错误不建议重试
    return false;
  }

  /**
   * 设置二维码监听器
   * 监听京东二维码生成接口，优雅处理多种响应格式
   */
  private setupQrCodeListener(
    page: Page,
    subject: Subject<JdLoginEvent>,
    sessionId: string,
  ) {
    page.on('response', async (response) => {
      const responseUrl = response.url();

      try {
        // 精确匹配京东二维码接口
        if (!responseUrl.includes('qr.m.jd.com/show')) {
          return;
        }

        this.logger.debug(`捕获京东二维码接口响应: ${responseUrl}, session: ${sessionId}`);

        const imageData = await this.extractQrImageData(response);

        if (imageData) {
          this.logger.log(`二维码数据提取成功: ${sessionId}`);

          subject.next({
            type: 'qrcode',
            data: { image: imageData }
          });
        } else {
          this.logger.warn(`二维码数据为空: ${sessionId}`);
          subject.next({
            type: 'error',
            data: { message: '二维码获取失败，请重试' }
          });
        }
      } catch (error) {
        this.logger.error(`二维码监听处理失败: ${responseUrl}, session: ${sessionId}`, error);
        subject.next({
          type: 'error',
          data: { message: '二维码处理异常' }
        });
      }
    });
  }

  /**
   * 从响应中优雅地提取二维码图片数据
   * 支持直接图片内容和URL重定向两种方式
   */
  private async extractQrImageData(response: any): Promise<string | null> {
    const contentType = response.headers()['content-type'] || '';

    // 处理直接返回图片内容的情况
    if (contentType.startsWith('image/')) {
      const buffer = await response.body();
      if (buffer.length > 0) {
        const base64Image = buffer.toString('base64');
        return `data:${contentType};base64,${base64Image}`;
      }
    }

    // 处理返回URL重定向的情况
    const location = response.headers()['location'];
    if (location) {
      const imageUrl = location.startsWith('//')
        ? `https:${location}`
        : location;

      this.logger.debug(`获取到二维码图片URL: ${imageUrl}`);
      return imageUrl;
    }

    // 尝试从响应体中解析URL
    try {
      const responseText = await response.text();
      const urlMatch = responseText.match(/https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|gif)/i);
      if (urlMatch) {
        return urlMatch[0];
      }
    } catch (error) {
      this.logger.debug('解析响应体URL失败', error);
    }

    return null;
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

              case 206:
                this.logger.log(`登录确认成功,正在跳转: ${sessionId}`);
                subject.next({
                  type: 'scanned',
                  data: { message: '登录确认成功，正在跳转...' }
                });
                break;

              default:
                this.logger.warn(`未知状态码: ${statusData.code}, 响应数据: ${JSON.stringify(statusData)}, session: ${sessionId}`);
                subject.next({
                  type: 'error',
                  data: { message: statusData.msg || `登录流程异常(状态码:${statusData.code})` }
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
            const userInfo = await this.extractUserInfo(page, cookies);

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
  private async extractUserInfo(page: Page, cookies: Cookie[]): Promise<JdUserInfo> {
    this.logger.debug('正在提取京东用户信息...');

    const apiUserInfo = await this.requestUserInfoByApi(cookies);
    if (apiUserInfo) {
      this.logger.log(`通过接口获取京东用户信息成功: ${apiUserInfo.uid}`);
      return apiUserInfo;
    }

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
   * 通过京东接口获取用户信息
   */
  private async requestUserInfoByApi(cookies: Cookie[]): Promise<JdUserInfo | null> {
    const cookieHeader = this.composeCookieHeader(cookies);
    if (!cookieHeader) {
      this.logger.warn('Cookie 为空，无法请求京东用户信息接口');
      return null;
    }

    const callbackName = 'jsonpUserinfo';
    const url = `${this.JD_USER_INFO_URL}?callback=${callbackName}&_=${Date.now()}`;

    try {
      const response = await this.httpService.axiosRef.get<string>(url, {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://hk.jd.com/',
          'Sec-Fetch-Dest': 'script',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieHeader,
        },
        timeout: 10000,
      });

      const payload = this.parseJsonp(response.data, callbackName);
      if (!payload) {
        this.logger.warn('京东用户信息接口返回格式异常');
        return null;
      }

      const pin = payload?.userScoreVO?.pin || payload?.realName || payload?.nickName;
      return {
        uid: pin || `jd_${Date.now()}`,
        nickname: payload?.nickName || pin || '京东用户',
        avatar: this.normalizeAvatarUrl(payload?.imgUrl),
      };
    } catch (error) {
      this.logger.warn(`京东用户信息接口请求失败: ${error?.message || error}`);
      return null;
    }
  }

  private composeCookieHeader(cookies: Cookie[]): string {
    return cookies
      .filter(cookie => cookie?.name && typeof cookie.value !== 'undefined')
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  private parseJsonp(payload: string, callbackName: string): any | null {
    if (!payload || !callbackName) {
      return null;
    }

    const prefix = `${callbackName}(`;
    const startIndex = payload.indexOf(prefix);
    const endIndex = payload.lastIndexOf(')');

    if (startIndex !== 0 || endIndex === -1) {
      return null;
    }

    try {
      const jsonText = payload.slice(prefix.length, endIndex);
      return JSON.parse(jsonText);
    } catch (error) {
      this.logger.warn(`解析京东用户信息 JSONP 失败: ${error?.message || error}`);
      return null;
    }
  }

  private normalizeAvatarUrl(url?: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return url;
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
