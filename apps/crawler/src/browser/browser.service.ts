import { Injectable, OnModuleDestroy } from '@nestjs/common';
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

  async initialize(config?: Partial<BrowserConfig>): Promise<void> {
    const defaultConfig: BrowserConfig = {
      headless: process.env.NODE_ENV === 'production',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      timeout: 30000
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
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

    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);

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