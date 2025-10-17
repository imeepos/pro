import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface BrowserConfig {
  headless: boolean;
  userAgent: string;
  viewport: { width: number; height: number };
  timeout: number;
}

interface BrowserMetrics {
  browserStartTime?: number;
  totalContextsCreated: number;
  totalContextsClosed: number;
  totalPagesCreated: number;
  activeContexts: number;
  memoryUsage?: NodeJS.MemoryUsage;
  lastActivity: number;
}

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private metrics: BrowserMetrics = {
    totalContextsCreated: 0,
    totalContextsClosed: 0,
    totalPagesCreated: 0,
    activeContexts: 0,
    lastActivity: Date.now()
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: any
  ) {}

  async initialize(config?: Partial<BrowserConfig>): Promise<void> {
    const initStartTime = Date.now();

    if (this.browser && this.browser.isConnected()) {
      this.logger.debug('浏览器已初始化且连接正常，跳过重复初始化');
      return;
    }

    const defaultConfig: BrowserConfig = {
      headless: this.configService.get<string>('NODE_ENV') === 'production',
      userAgent: this.crawlerConfig.userAgent,
      viewport: this.crawlerConfig.viewport,
      timeout: this.crawlerConfig.timeout
    };

    const browserConfig = { ...defaultConfig, ...config };

    this.logger.debug('开始初始化浏览器实例', {
      headless: browserConfig.headless,
      userAgent: browserConfig.userAgent.substring(0, 50) + '...',
      viewport: browserConfig.viewport,
      timeout: browserConfig.timeout
    });

    try {
      if (this.browser) {
        await this.browser.close();
        this.logger.debug('关闭已存在的浏览器实例');
      }

      this.browser = await chromium.launch({
        headless: browserConfig.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        ]
      });

      this.metrics.browserStartTime = Date.now();
      this.updateMemoryUsage();

      const initDuration = Date.now() - initStartTime;

      this.logger.log('浏览器初始化成功', {
        initTimeMs: initDuration,
        headless: browserConfig.headless,
        processId: process.pid,
        memoryUsage: {
          rss: Math.round((this.metrics.memoryUsage?.rss || 0) / 1024 / 1024),
          heapTotal: Math.round((this.metrics.memoryUsage?.heapTotal || 0) / 1024 / 1024),
          heapUsed: Math.round((this.metrics.memoryUsage?.heapUsed || 0) / 1024 / 1024)
        }
      });

    } catch (error) {
      const initDuration = Date.now() - initStartTime;
      this.logger.error('浏览器初始化失败', {
        initTimeMs: initDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async createContext(accountId: number, cookies: any[]): Promise<BrowserContext> {
    const contextStartTime = Date.now();
    const contextKey = `account_${accountId}`;

    this.logger.debug('开始创建浏览器上下文', {
      accountId,
      contextKey,
      hasCookies: !!(cookies && cookies.length > 0),
      cookiesCount: cookies?.length || 0
    });

    try {
      if (!this.browser) {
        await this.initialize();
      }

      // 检查是否已存在该账号的上下文
      if (this.contexts.has(contextKey)) {
        const existingContext = this.contexts.get(contextKey)!;
        if (!existingContext.browser().isConnected()) {
          this.logger.warn('发现断开连接的上下文，将重新创建', {
            accountId,
            contextKey
          });
          this.contexts.delete(contextKey);
        } else {
          this.logger.debug('复用已存在的浏览器上下文', {
            accountId,
            contextKey
          });
          return existingContext;
        }
      }

      const context = await this.browser!.newContext({
        userAgent: this.crawlerConfig.userAgent,
        viewport: this.crawlerConfig.viewport,
        ignoreHTTPSErrors: true,
        acceptDownloads: false,
        javaScriptEnabled: true
      });

      // 注入cookies
      if (cookies && cookies.length > 0) {
        try {
          await context.addCookies(cookies);
          this.logger.debug('cookies注入成功', {
            accountId,
            cookiesCount: cookies.length
          });
        } catch (cookieError) {
          this.logger.warn('cookies注入失败，继续执行', {
            accountId,
            error: cookieError instanceof Error ? cookieError.message : '未知错误'
          });
        }
      }

      // 注入反检测脚本
      await context.addInitScript(() => {
        // 隐藏webdriver属性
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // 伪装plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // 伪装languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en'],
        });

        // 伪装permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'granted' } as PermissionStatus) :
            originalQuery(parameters)
        );

        // 伪装Chrome对象
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
      });

      // 阻止不必要的资源加载以提高性能
      await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,css,font,woff,woff2,ico}', (route) => {
        route.abort();
      });

      this.contexts.set(contextKey, context);
      this.metrics.totalContextsCreated++;
      this.metrics.activeContexts = this.contexts.size;
      this.metrics.lastActivity = Date.now();

      const contextDuration = Date.now() - contextStartTime;

      this.logger.debug('浏览器上下文创建成功', {
        accountId,
        contextKey,
        creationTimeMs: contextDuration,
        activeContextsCount: this.contexts.size,
        totalContextsCreated: this.metrics.totalContextsCreated
      });

      return context;

    } catch (error) {
      const contextDuration = Date.now() - contextStartTime;
      this.logger.error('浏览器上下文创建失败', {
        accountId,
        contextKey,
        creationTimeMs: contextDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async createPage(accountId: number, cookies: any[]): Promise<Page> {
    const pageStartTime = Date.now();

    try {
      const context = await this.createContext(accountId, cookies);
      const page = await context.newPage();

      // 设置页面超时
      await page.setDefaultTimeout(this.crawlerConfig.timeout);
      await page.setDefaultNavigationTimeout(this.crawlerConfig.pageTimeout);

      // 设置页面事件监听
      page.on('dialog', async (dialog) => {
        this.logger.debug('页面弹窗自动关闭', {
          accountId,
          dialogType: dialog.type(),
          dialogMessage: dialog.message()
        });
        await dialog.dismiss();
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          this.logger.debug('页面控制台错误', {
            accountId,
            text: msg.text(),
            location: msg.location()
          });
        }
      });

      page.on('pageerror', (error) => {
        this.logger.debug('页面JavaScript错误', {
          accountId,
          error: error.message,
          stack: error.stack
        });
      });

      // 监控页面资源加载
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();

        if (['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
          this.logger.debug('页面资源请求', {
            accountId,
            resourceType,
            url: url.length > 100 ? url.substring(0, 100) + '...' : url
          });
        }
      });

      page.on('response', (response) => {
        const resourceType = response.request().resourceType();
        const status = response.status();

        if (status >= 400 && ['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
          this.logger.debug('页面资源响应异常', {
            accountId,
            resourceType,
            status,
            url: response.url().length > 100 ? response.url().substring(0, 100) + '...' : response.url()
          });
        }
      });

      this.metrics.totalPagesCreated++;
      this.metrics.lastActivity = Date.now();

      const pageDuration = Date.now() - pageStartTime;

      this.logger.debug('页面创建成功', {
        accountId,
        creationTimeMs: pageDuration,
        totalPagesCreated: this.metrics.totalPagesCreated,
        activeContextsCount: this.contexts.size
      });

      return page;

    } catch (error) {
      const pageDuration = Date.now() - pageStartTime;
      this.logger.error('页面创建失败', {
        accountId,
        creationTimeMs: pageDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async closeContext(accountId: number): Promise<void> {
    const contextStartTime = Date.now();
    const contextKey = `account_${accountId}`;
    const context = this.contexts.get(contextKey);

    if (!context) {
      this.logger.debug('尝试关闭不存在的上下文', {
        accountId,
        contextKey
      });
      return;
    }

    try {
      await context.close();
      this.contexts.delete(contextKey);

      this.metrics.totalContextsClosed++;
      this.metrics.activeContexts = this.contexts.size;
      this.metrics.lastActivity = Date.now();

      const closeDuration = Date.now() - contextStartTime;

      this.logger.debug('浏览器上下文关闭成功', {
        accountId,
        contextKey,
        closeTimeMs: closeDuration,
        remainingContextsCount: this.contexts.size,
        totalContextsClosed: this.metrics.totalContextsClosed
      });

    } catch (error) {
      const closeDuration = Date.now() - contextStartTime;
      this.logger.error('浏览器上下文关闭失败', {
        accountId,
        contextKey,
        closeTimeMs: closeDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 即使关闭失败，也要从映射中移除，避免泄漏
      this.contexts.delete(contextKey);
      this.metrics.activeContexts = this.contexts.size;
    }
  }

  async getBrowserState(): Promise<{
    isConnected: boolean;
    contextsCount: number;
    metrics: BrowserMetrics;
    uptime: number;
  }> {
    this.updateMemoryUsage();

    const uptime = this.metrics.browserStartTime
      ? Date.now() - this.metrics.browserStartTime
      : 0;

    return {
      isConnected: this.browser?.isConnected() || false,
      contextsCount: this.contexts.size,
      metrics: { ...this.metrics },
      uptime
    };
  }

  // 获取详细的性能指标
  async getDetailedMetrics(): Promise<{
    browser: {
      isConnected: boolean;
      uptime: number;
      processId: number;
    };
    contexts: Array<{
      accountId: number;
      contextKey: string;
      creationTime?: number;
      age: number;
    }>;
    system: {
      memoryUsage: NodeJS.MemoryUsage;
      activeContexts: number;
      totalCreated: number;
      totalClosed: number;
      lastActivity: number;
      idleTime: number;
    };
  }> {
    this.updateMemoryUsage();

    const now = Date.now();
    const uptime = this.metrics.browserStartTime ? now - this.metrics.browserStartTime : 0;
    const idleTime = now - this.metrics.lastActivity;

    const contexts = Array.from(this.contexts.entries()).map(([contextKey, context]) => {
      const accountId = parseInt(contextKey.replace('account_', ''));
      return {
        accountId,
        contextKey,
        age: 0 // Playwright 不提供创建时间，可以通过其他方式追踪
      };
    });

    return {
      browser: {
        isConnected: this.browser?.isConnected() || false,
        uptime,
        processId: process.pid
      },
      contexts,
      system: {
        memoryUsage: this.metrics.memoryUsage || process.memoryUsage(),
        activeContexts: this.contexts.size,
        totalCreated: this.metrics.totalContextsCreated,
        totalClosed: this.metrics.totalContextsClosed,
        lastActivity: this.metrics.lastActivity,
        idleTime
      }
    };
  }

  // 清理空闲的上下文
  async cleanupIdleContexts(maxIdleTime: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now();
    const contextsToClose: string[] = [];

    for (const [contextKey, context] of this.contexts) {
      // 简单的清理策略：如果有上下文存在时间过长就关闭
      // 在实际应用中，可以记录每个上下文的最后使用时间
      const accountId = parseInt(contextKey.replace('account_', ''));

      this.logger.debug('检查上下文是否需要清理', {
        accountId,
        contextKey,
        maxIdleTime
      });

      // 这里可以实现更复杂的清理逻辑
      // 目前暂时不自动清理，因为每个账号可能需要长期使用
    }

    if (contextsToClose.length > 0) {
      this.logger.log('开始清理空闲上下文', {
        contextsToCloseCount: contextsToClose.length,
        contextKeys: contextsToClose
      });

      for (const contextKey of contextsToClose) {
        const accountId = parseInt(contextKey.replace('account_', ''));
        await this.closeContext(accountId);
      }
    }

    return contextsToClose.length;
  }

  async onModuleDestroy(): Promise<void> {
    const destroyStartTime = Date.now();
    let contextsClosed = 0;
    let closeErrors = 0;

    this.logger.log('开始清理浏览器资源', {
      activeContextsCount: this.contexts.size,
      isConnected: this.browser?.isConnected() || false
    });

    // 关闭所有上下文
    for (const [contextKey, context] of this.contexts) {
      try {
        await context.close();
        contextsClosed++;
      } catch (error) {
        closeErrors++;
        this.logger.warn('关闭上下文失败', {
          contextKey,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    this.contexts.clear();

    // 关闭浏览器实例
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.debug('浏览器实例关闭成功');
      } catch (error) {
        this.logger.error('浏览器实例关闭失败', {
          error: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined
        });
      } finally {
        this.browser = null;
      }
    }

    const destroyDuration = Date.now() - destroyStartTime;

    this.logger.log('浏览器资源清理完成', {
      duration: destroyDuration,
      contextsClosed,
      closeErrors,
      finalMetrics: this.metrics
    });
  }

  private updateMemoryUsage(): void {
    try {
      this.metrics.memoryUsage = process.memoryUsage();
    } catch (error) {
      this.logger.debug('获取内存使用情况失败', {
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}