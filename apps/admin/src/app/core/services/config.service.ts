import { Injectable, inject } from '@angular/core';
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
  private readonly sdk = inject(SkerSDK);
  private amapApiKeyCache: CachedConfig | null = null;
  private readonly amapApiKeySubject = new BehaviorSubject<string>('');
  private readonly amapApiKey$ = this.amapApiKeySubject.asObservable().pipe(
    shareReplay(1)
  );

  constructor() {
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
    console.log('开始异步获取高德地图API Key...');

    return from(this.sdk.config.getAmapApiKey()).pipe(
      map(apiKey => {
        console.log('从后端获取到API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'null');

        // 验证API Key的有效性
        if (!apiKey || apiKey === 'YOUR_AMAP_KEY' || apiKey.length < 10) {
          console.warn('后端返回的API Key无效:', {
            hasKey: !!apiKey,
            length: apiKey?.length || 0,
            isPlaceholder: apiKey === 'YOUR_AMAP_KEY'
          });
          throw new Error('后端返回的API Key无效');
        }

        // 缓存结果 (1小时有效期)
        const expiresAt = Date.now() + (60 * 60 * 1000);
        this.amapApiKeyCache = {
          value: apiKey,
          expiresAt,
          isExpired: () => Date.now() > expiresAt
        };

        console.log('API Key验证通过，已缓存');
        this.amapApiKeySubject.next(apiKey);
        return apiKey;
      }),
      catchError(error => {
        console.error('获取高德地图API Key失败:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // 降级策略：如果环境变量中有值，检查是否可用
        const envApiKey = environment.amapApiKey || '';
        if (envApiKey && envApiKey !== 'YOUR_AMAP_KEY' && envApiKey.length >= 10) {
          console.warn('使用环境变量中的API Key作为降级方案:', `${envApiKey.substring(0, 8)}...`);
          this.amapApiKeySubject.next(envApiKey);
          return of(envApiKey);
        } else if (envApiKey) {
          console.warn('环境变量中的API Key也无效:', {
            hasKey: !!envApiKey,
            length: envApiKey?.length || 0,
            isPlaceholder: envApiKey === 'YOUR_AMAP_KEY'
          });
        } else {
          console.warn('环境变量中未找到API Key配置');
        }

        // 返回空字符串，让调用方处理
        console.error('所有API Key获取方式都失败，返回空值');
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