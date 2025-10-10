import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, EMPTY } from 'rxjs';
import { catchError, map, shareReplay, take } from 'rxjs/operators';
import { SkerSDK } from '@pro/sdk';
import { environment } from '../../../environments/environment';

interface CachedConfig {
  value: string;
  expiresAt: number;
  isExpired: () => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly sdk: SkerSDK;
  private amapApiKeyCache: CachedConfig | null = null;
  private readonly amapApiKeySubject = new BehaviorSubject<string>('');
  private readonly amapApiKey$ = this.amapApiKeySubject.asObservable().pipe(
    shareReplay(1)
  );

  constructor() {
    this.sdk = new SkerSDK(environment.apiUrl);

    // 如果环境变量中有有效的API Key，则使用它作为初始值
    const envApiKey = environment.amapApiKey || '';
    if (envApiKey && envApiKey !== 'YOUR_AMAP_KEY') {
      this.amapApiKeySubject.next(envApiKey);
    }
  }

  /**
   * 获取高德地图API Key (同步方法，保持向后兼容)
   */
  getAmapApiKey(): string {
    const currentKey = this.amapApiKeySubject.value;

    // 如果当前有值且不是环境变量的默认值，直接返回
    if (currentKey && currentKey !== 'YOUR_AMAP_KEY') {
      return currentKey;
    }

    // 如果环境变量中有有效值，使用它
    const envApiKey = environment.amapApiKey || '';
    if (envApiKey && envApiKey !== 'YOUR_AMAP_KEY') {
      return envApiKey;
    }

    // 触发异步获取，但返回空字符串以保持同步签名
    this.fetchAmapApiKeyAsync().subscribe();

    return '';
  }

  /**
   * 获取高德地图API Key (Observable方式，推荐使用)
   */
  getAmapApiKeyObservable(): Observable<string> {
    // 检查缓存是否有效
    if (this.amapApiKeyCache && !this.amapApiKeyCache.isExpired()) {
      return of(this.amapApiKeyCache.value);
    }

    // 如果当前值有效且不是默认值，直接返回
    const currentValue = this.amapApiKeySubject.value;
    if (currentValue && currentValue !== 'YOUR_AMAP_KEY') {
      return of(currentValue);
    }

    // 如果环境变量中有有效值，使用它
    const envApiKey = environment.amapApiKey || '';
    if (envApiKey && envApiKey !== 'YOUR_AMAP_KEY') {
      this.amapApiKeySubject.next(envApiKey);
      return of(envApiKey);
    }

    // 触发异步获取
    return this.fetchAmapApiKeyAsync();
  }

  /**
   * 异步获取高德地图API Key
   */
  private fetchAmapApiKeyAsync(): Observable<string> {
    return from(this.sdk.config.getAmapApiKey()).pipe(
      map(apiKey => {
        // 缓存结果 (1小时有效期)
        const expiresAt = Date.now() + (60 * 60 * 1000);
        this.amapApiKeyCache = {
          value: apiKey,
          expiresAt,
          isExpired: () => Date.now() > expiresAt
        };

        this.amapApiKeySubject.next(apiKey);
        return apiKey;
      }),
      catchError(error => {
        console.error('获取高德地图API Key失败:', error);

        // 降级策略：如果环境变量中有值，即使不理想也使用
        const envApiKey = environment.amapApiKey || '';
        if (envApiKey) {
          this.amapApiKeySubject.next(envApiKey);
          return of(envApiKey);
        }

        // 返回空字符串，让调用方处理
        return of('');
      }),
      shareReplay(1)
    );
  }

  /**
   * 检查是否有有效的高德地图API Key
   */
  hasValidAmapKey(): boolean {
    const currentKey = this.amapApiKeySubject.value;

    // 检查当前值
    if (currentKey && currentKey !== 'YOUR_AMAP_KEY') {
      return true;
    }

    // 检查环境变量
    const envApiKey = environment.amapApiKey || '';
    return !!(envApiKey && envApiKey !== 'YOUR_AMAP_KEY');
  }

  /**
   * 检查高德地图API Key是否可用 (异步方式)
   */
  hasValidAmapKeyAsync(): Observable<boolean> {
    return this.getAmapApiKeyObservable().pipe(
      map(key => !!key && key !== 'YOUR_AMAP_KEY')
    );
  }

  /**
   * 清除缓存，强制下次调用时重新获取
   */
  clearCache(): void {
    this.amapApiKeyCache = null;
  }

  /**
   * 手动刷新API Key
   */
  refreshAmapApiKey(): Observable<string> {
    this.clearCache();
    return this.fetchAmapApiKeyAsync();
  }
}