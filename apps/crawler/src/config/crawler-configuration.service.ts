import { Inject, Injectable, Logger } from '@nestjs/common';
import { CrawlerConfig, WeiboConfig } from './crawler.interface';

type AntiDetectionMode = 'basic' | 'stealth' | 'cdp';

@Injectable()
export class CrawlerConfigurationService {
  private readonly logger = new Logger(CrawlerConfigurationService.name);

  constructor(
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboConfig,
  ) {}

  getRequestDelayRange(): { min: number; max: number } {
    const { min, max } = this.crawlerConfig.requestDelay;
    return { min, max };
  }

  getMaxPages(): number {
    return this.crawlerConfig.maxPages;
  }

  getAdaptiveDelayConfig(): CrawlerConfig['rateMonitoring']['adaptiveDelay'] {
    return { ...this.crawlerConfig.rateMonitoring.adaptiveDelay };
  }

  getPageTimeout(): number {
    return this.crawlerConfig.pageTimeout;
  }

  getAntiDetectionConfig(): CrawlerConfig['antiDetection'] & { mode: AntiDetectionMode } {
    const base = this.crawlerConfig.antiDetection;
    const mode: AntiDetectionMode = base.cdpMode
      ? 'cdp'
      : base.stealthScript
        ? 'stealth'
        : 'basic';

    return {
      ...base,
      mode,
    };
  }

  updateAntiDetectionMode(mode: AntiDetectionMode): void {
    const config = this.crawlerConfig.antiDetection;

    if (mode === 'cdp') {
      config.cdpMode = true;
      config.stealthScript = true;
    } else if (mode === 'stealth') {
      config.cdpMode = false;
      config.stealthScript = true;
    } else {
      config.cdpMode = false;
      config.stealthScript = false;
    }

    this.logger.log(`Anti-detection mode updated to: ${mode}`);
  }

  getWeiboSelectors(): WeiboConfig['selectors'] {
    return { ...this.weiboConfig.selectors };
  }

  updateWeiboSelectors(selectors: WeiboConfig['selectors']): void {
    this.weiboConfig.selectors = { ...selectors };
    this.logger.log('Weibo selectors updated');
  }
}
