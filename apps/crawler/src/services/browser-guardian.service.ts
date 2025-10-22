import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, Page, chromium } from 'playwright';
import { CrawlerRuntimeConfig } from '../config/crawler.config';

export type NavigationLifecycle = 'load' | 'domcontentloaded' | 'networkidle';

export interface RenderDirective {
  waitUntil?: NavigationLifecycle;
  waitForSelector?: string | string[];
  idleTimeMs?: number;
  timeoutMs?: number;
}

export interface BrowserRenderRequest {
  url: string;
  headers?: Record<string, string>;
  directive?: RenderDirective;
}

export interface BrowserRenderResult {
  body: string;
  status: number;
  finalUrl: string;
}

export interface BrowserHealthSnapshot {
  enabled: boolean;
  ok: boolean;
  finalUrl?: string;
  error?: string;
}

export class RenderingDisabledError extends Error {
  constructor() {
    super('浏览器渲染模式尚未启用，请检查 CRAWLER_RENDERING_ENABLED 配置');
    this.name = 'RenderingDisabledError';
  }
}

@Injectable()
export class BrowserGuardianService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserGuardianService.name);
  private browserPromise?: Promise<Browser>;

  constructor(@Inject('CRAWLER_RUNTIME_CONFIG') private readonly config: CrawlerRuntimeConfig) {}

  get isEnabled(): boolean {
    return this.config.rendering.enabled;
  }

  async render(request: BrowserRenderRequest): Promise<BrowserRenderResult> {
    if (!this.isEnabled) {
      throw new RenderingDisabledError();
    }

    return this.useIsolatedPage(async (page) => {
      if (request.headers) {
        await page.setExtraHTTPHeaders(request.headers);
      }

      const directive = request.directive ?? {};
      const navigationTimeout = this.config.rendering.navigationTimeoutMs;
      const interactionTimeout = directive.timeoutMs ?? this.config.rendering.actionTimeoutMs;

      page.setDefaultTimeout(interactionTimeout);
      page.setDefaultNavigationTimeout(navigationTimeout);

      const response = await page.goto(request.url, {
        waitUntil: directive.waitUntil ?? 'domcontentloaded',
        timeout: navigationTimeout,
      });

      const selectors = Array.isArray(directive.waitForSelector)
        ? directive.waitForSelector
        : directive.waitForSelector
          ? [directive.waitForSelector]
          : [];
      for (const selector of selectors) {
        await page.waitForSelector(selector, { timeout: interactionTimeout });
      }

      if (directive.idleTimeMs && directive.idleTimeMs > 0) {
        await page.waitForTimeout(directive.idleTimeMs);
      }

      const body = await page.content();
      return {
        body,
        status: response?.status() ?? 0,
        finalUrl: page.url(),
      };
    }, request.url);
  }

  async health(): Promise<BrowserHealthSnapshot> {
    if (!this.isEnabled) {
      return { enabled: false, ok: true };
    }

    try {
      const result = await this.render({
        url: this.config.rendering.warmupUrl,
        directive: { waitUntil: 'domcontentloaded' },
      });

      const ok = result.status >= 200 && result.status < 400;
      return {
        enabled: true,
        ok,
        finalUrl: result.finalUrl,
        error: ok ? undefined : `Unexpected status ${result.status}`,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error('浏览器健康检查失败', { detail });
      return { enabled: true, ok: false, error: detail };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async useIsolatedPage<T>(work: (page: Page) => Promise<T>, url: string): Promise<T> {
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      userAgent: this.config.userAgent,
    });

    try {
      const page = await context.newPage();
      const outcome = await work(page);
      return outcome;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error('页面渲染失败', { url, detail });
      throw error;
    } finally {
      await context.close();
    }
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium
        .launch({ headless: this.config.rendering.headless })
        .then((browser) => {
          this.logger.log('Chromium 已启动，用于动态页面渲染');
          return browser;
        })
        .catch((error) => {
          this.browserPromise = undefined;
          throw error;
        });
    }

    return this.browserPromise;
  }

  private async shutdown(): Promise<void> {
    if (!this.browserPromise) {
      return;
    }

    try {
      const browser = await this.browserPromise;
      await browser.close();
      this.logger.log('Chromium 已关闭');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error('关闭 Chromium 失败', { detail });
    } finally {
      this.browserPromise = undefined;
    }
  }
}
