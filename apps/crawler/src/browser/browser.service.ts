import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface BrowserConfig {
  headless: boolean;
  userAgent: string;
  viewport: { width: number; height: number };
  timeout: number;
}

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: any
  ) {}

  async initialize(config?: Partial<BrowserConfig>): Promise<void> {
    const defaultConfig: BrowserConfig = {
      headless: this.configService.get<string>('NODE_ENV') === 'production',
      userAgent: this.crawlerConfig.userAgent,
      viewport: this.crawlerConfig.viewport,
      timeout: this.crawlerConfig.timeout
    };

    const browserConfig = { ...defaultConfig, ...config };

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({
      headless: browserConfig.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    console.log('浏览器初始化成功');
  }

  async createContext(accountId: number, cookies: any[]): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initialize();
    }

    const contextKey = `account_${accountId}`;

    if (this.contexts.has(contextKey)) {
      const existingContext = this.contexts.get(contextKey)!;
      if (!existingContext.browser().isConnected()) {
        this.contexts.delete(contextKey);
      } else {
        return existingContext;
      }
    }

    const context = await this.browser!.newContext({
      userAgent: this.crawlerConfig.userAgent,
      viewport: this.crawlerConfig.viewport,
      ignoreHTTPSErrors: true,
      acceptDownloads: false
    });

    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies);
    }

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'granted' } as PermissionStatus) :
          originalQuery(parameters)
      );
    });

    await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,css,font,woff,woff2}', (route) => {
      route.abort();
    });

    this.contexts.set(contextKey, context);
    return context;
  }

  async createPage(accountId: number, cookies: any[]): Promise<Page> {
    const context = await this.createContext(accountId, cookies);
    const page = await context.newPage();

    await page.setDefaultTimeout(this.crawlerConfig.timeout);
    await page.setDefaultNavigationTimeout(this.crawlerConfig.pageTimeout);

    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    return page;
  }

  async closeContext(accountId: number): Promise<void> {
    const contextKey = `account_${accountId}`;
    const context = this.contexts.get(contextKey);

    if (context) {
      await context.close();
      this.contexts.delete(contextKey);
    }
  }

  async getBrowserState(): Promise<{
    isConnected: boolean;
    contextsCount: number;
  }> {
    return {
      isConnected: this.browser?.isConnected() || false,
      contextsCount: this.contexts.size
    };
  }

  async onModuleDestroy(): Promise<void> {
    for (const [_, context] of this.contexts) {
      await context.close();
    }
    this.contexts.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}