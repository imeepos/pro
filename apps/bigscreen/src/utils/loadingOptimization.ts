/**
 * 加载性能优化工具
 * 提供资源优化、预加载和缓存策略
 */

import { createLogger } from './logger';

const logger = createLogger('LoadingOptimization');

// Network Information API types
interface NetworkInformation extends EventTarget {
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

// ================== 资源预加载 ==================

/**
 * 预加载关键资源
 */
export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * 预加载JavaScript模块
   */
  async preloadModule(modulePath: string): Promise<any> {
    if (this.preloadedResources.has(modulePath)) {
      return this.preloadPromises.get(modulePath);
    }

    const preloadPromise = import(/* webpackChunkName: "preload" */ modulePath)
      .then(module => {
        this.preloadedResources.add(modulePath);
        logger.debug('Module preloaded successfully', { modulePath });
        return module;
      })
      .catch(error => {
        logger.error('Module preload failed', error);
        throw error;
      });

    this.preloadPromises.set(modulePath, preloadPromise);
    return preloadPromise;
  }

  /**
   * 预加载图片资源
   */
  async preloadImage(src: string): Promise<HTMLImageElement> {
    if (this.preloadedResources.has(src)) {
      return Promise.resolve(new Image());
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedResources.add(src);
        logger.debug('Image preloaded successfully', { src });
        resolve(img);
      };
      
      img.onerror = (error) => {
        logger.error('Image preload failed', error);
        reject(error);
      };
      
      img.src = src;
    });
  }

  /**
   * 预加载CSS文件
   */
  async preloadCSS(href: string): Promise<void> {
    if (this.preloadedResources.has(href)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      link.onload = () => {
        this.preloadedResources.add(href);
        logger.debug('CSS preloaded successfully', { href });
        resolve();
      };
      
      link.onerror = (error) => {
        logger.error('CSS preload failed', error);
        reject(error);
      };
      
      document.head.appendChild(link);
    });
  }

  /**
   * 预加载字体
   */
  async preloadFont(fontUrl: string, fontFamily: string): Promise<void> {
    if (this.preloadedResources.has(fontUrl)) {
      return Promise.resolve();
    }

    try {
      const font = new FontFace(fontFamily, `url(${fontUrl})`);
      await font.load();
      document.fonts.add(font);
      
      this.preloadedResources.add(fontUrl);
      logger.debug('Font preloaded successfully', { fontUrl, fontFamily });
    } catch (error) {
      logger.error('Font preload failed', error);
      throw error;
    }
  }

  /**
   * 批量预加载资源
   */
  async preloadResources(resources: {
    modules?: string[];
    images?: string[];
    css?: string[];
    fonts?: Array<{ url: string; family: string }>;
  }): Promise<void> {
    const promises: Promise<any>[] = [];

    // 预加载模块
    if (resources.modules) {
      promises.push(...resources.modules.map(module => 
        this.preloadModule(module).catch(error => 
          logger.warn('Module preload failed', { module, error })
        )
      ));
    }

    // 预加载图片
    if (resources.images) {
      promises.push(...resources.images.map(image => 
        this.preloadImage(image).catch(error => 
          logger.warn('Image preload failed', { image, error })
        )
      ));
    }

    // 预加载CSS
    if (resources.css) {
      promises.push(...resources.css.map(css => 
        this.preloadCSS(css).catch(error => 
          logger.warn('CSS preload failed', { css, error })
        )
      ));
    }

    // 预加载字体
    if (resources.fonts) {
      promises.push(...resources.fonts.map(font => 
        this.preloadFont(font.url, font.family).catch(error => 
          logger.warn('Font preload failed', { font, error })
        )
      ));
    }

    await Promise.allSettled(promises);
  }

  /**
   * 检查资源是否已预加载
   */
  isPreloaded(resource: string): boolean {
    return this.preloadedResources.has(resource);
  }

  /**
   * 清除预加载缓存
   */
  clearCache(): void {
    this.preloadedResources.clear();
    this.preloadPromises.clear();
  }
}

// ================== 图片优化 ==================

/**
 * 图片懒加载观察器
 */
export class ImageLazyLoader {
  private static instance: ImageLazyLoader;
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  static getInstance(): ImageLazyLoader {
    if (!ImageLazyLoader.instance) {
      ImageLazyLoader.instance = new ImageLazyLoader();
    }
    return ImageLazyLoader.instance;
  }

  constructor() {
    this.initObserver();
  }

  private initObserver(): void {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage(entry.target as HTMLImageElement);
              this.observer?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // 提前50px开始加载
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * 观察图片元素
   */
  observe(img: HTMLImageElement): void {
    if (this.observer && !this.loadedImages.has(img.dataset.src || '')) {
      this.observer.observe(img);
    }
  }

  /**
   * 加载图片
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset['src']!;
    if (src && !this.loadedImages.has(src)) {
      img.src = src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
      this.loadedImages.add(src);
      
      logger.debug('Image loaded lazily', { src });
    }
  }

  /**
   * 取消观察
   */
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }

  /**
   * 断开观察器
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// ================== 代码分割优化 ==================

/**
 * 动态导入管理器
 */
export class DynamicImportManager {
  private static instance: DynamicImportManager;
  private importCache = new Map<string, Promise<any>>();
  private moduleCache = new Map<string, any>();

  static getInstance(): DynamicImportManager {
    if (!DynamicImportManager.instance) {
      DynamicImportManager.instance = new DynamicImportManager();
    }
    return DynamicImportManager.instance;
  }

  /**
   * 缓存导入
   */
  async importWithCache<T = any>(
    modulePath: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    // 检查模块缓存
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }

    // 检查导入缓存
    if (this.importCache.has(modulePath)) {
      return this.importCache.get(modulePath);
    }

    // 开始导入
    const importPromise = importFn()
      .then(module => {
        this.moduleCache.set(modulePath, module);
        this.importCache.delete(modulePath);
        logger.debug('Module imported and cached', { modulePath });
        return module;
      })
      .catch(error => {
        this.importCache.delete(modulePath);
        logger.error('Module import failed', error);
        throw error;
      });

    this.importCache.set(modulePath, importPromise);
    return importPromise;
  }

  /**
   * 预热模块
   */
  async warmupModule(modulePath: string, importFn: () => Promise<any>): Promise<void> {
    try {
      await this.importWithCache(modulePath, importFn);
      logger.debug('Module warmed up', { modulePath });
    } catch (error) {
      logger.warn('Module warmup failed', { modulePath, error });
    }
  }

  /**
   * 批量预热模块
   */
  async warmupModules(modules: Array<{
    path: string;
    importFn: () => Promise<any>;
  }>): Promise<void> {
    const promises = modules.map(({ path, importFn }) => 
      this.warmupModule(path, importFn)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.importCache.clear();
    this.moduleCache.clear();
  }

  /**
   * 获取缓存状态
   */
  getCacheStats(): {
    importCacheSize: number;
    moduleCacheSize: number;
    cachedModules: string[];
  } {
    return {
      importCacheSize: this.importCache.size,
      moduleCacheSize: this.moduleCache.size,
      cachedModules: Array.from(this.moduleCache.keys()),
    };
  }
}

// ================== 网络优化 ==================

/**
 * 网络连接优化
 */
export class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private connectionType: string = 'unknown';
  private effectiveType: string = 'unknown';

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  constructor() {
    this.detectConnection();
    this.setupConnectionListener();
  }

  /**
   * 检测网络连接
   */
  private detectConnection(): void {
    const connection = this.getConnection();
    if (!connection) {
      return;
    }

    this.connectionType = connection.type ?? 'unknown';
    this.effectiveType = connection.effectiveType ?? 'unknown';
    
    logger.debug('Network connection detected', {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    });
  }

  /**
   * 监听连接变化
   */
  private setupConnectionListener(): void {
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener('change', () => {
        this.detectConnection();
        this.adjustOptimizations();
      });
    }
  }

  private getConnection(): NetworkInformation | null {
    if ('connection' in navigator) {
      const candidate = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      return candidate ?? null;
    }
    return null;
  }

  /**
   * 根据网络状况调整优化策略
   */
  private adjustOptimizations(): void {
    const isSlowConnection = this.effectiveType === 'slow-2g' || this.effectiveType === '2g';
    
    if (isSlowConnection) {
      logger.info('Slow connection detected, adjusting optimizations');
      // 可以触发一些优化策略
      this.enableDataSaver();
    } else {
      this.disableDataSaver();
    }
  }

  /**
   * 启用省流模式
   */
  private enableDataSaver(): void {
    document.documentElement.classList.add('data-saver');
    
    // 可以在CSS中定义.data-saver样式来减少动画、图片质量等
    logger.debug('Data saver mode enabled');
  }

  /**
   * 禁用省流模式
   */
  private disableDataSaver(): void {
    document.documentElement.classList.remove('data-saver');
    logger.debug('Data saver mode disabled');
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    type: string;
    effectiveType: string;
    isSlowConnection: boolean;
  } {
    return {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      isSlowConnection: this.effectiveType === 'slow-2g' || this.effectiveType === '2g',
    };
  }

  /**
   * 是否应该延迟加载
   */
  shouldDeferLoading(): boolean {
    return this.effectiveType === 'slow-2g' || this.effectiveType === '2g';
  }

  /**
   * 获取推荐的图片质量
   */
  getRecommendedImageQuality(): 'low' | 'medium' | 'high' {
    switch (this.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low';
      case '3g':
        return 'medium';
      default:
        return 'high';
    }
  }
}

// ================== 导出实例 ==================

export const resourcePreloader = ResourcePreloader.getInstance();
export const imageLazyLoader = ImageLazyLoader.getInstance();
export const dynamicImportManager = DynamicImportManager.getInstance();
export const networkOptimizer = NetworkOptimizer.getInstance();

// ================== 便捷函数 ==================

/**
 * 智能预加载策略
 */
export async function intelligentPreload(options: {
  critical?: string[];
  normal?: string[];
  defer?: string[];
}): Promise<void> {
  const { critical = [], normal = [], defer = [] } = options;
  const connectionInfo = networkOptimizer.getConnectionInfo();

  // 关键资源立即加载
  if (critical.length > 0) {
    await resourcePreloader.preloadResources({
      modules: critical,
    });
  }

  // 根据网络状况决定是否加载普通资源
  if (!connectionInfo.isSlowConnection && normal.length > 0) {
    setTimeout(() => {
      resourcePreloader.preloadResources({
        modules: normal,
      });
    }, 1000);
  }

  // 延迟资源在空闲时加载
  if (defer.length > 0) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        resourcePreloader.preloadResources({
          modules: defer,
        });
      });
    } else {
      setTimeout(() => {
        resourcePreloader.preloadResources({
          modules: defer,
        });
      }, 5000);
    }
  }
}

/**
 * 优化图片元素
 */
export function optimizeImage(img: HTMLImageElement, options: {
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
  placeholder?: string;
} = {}): void {
  const { lazy = true, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=' } = options;
  
  if (lazy) {
    // 设置懒加载
    const originalSrc = img.src;
    img.src = placeholder;
    img.dataset.src = originalSrc;
    img.classList.add('lazy');
    
    // 启动懒加载观察
    imageLazyLoader.observe(img);
  }

  // 根据网络状况调整图片质量
  const quality = options.quality || networkOptimizer.getRecommendedImageQuality();
  if (quality === 'low') {
    img.style.imageRendering = 'pixelated';
  }
}

/**
 * 性能友好的动态导入
 */
export async function performantImport<T>(
  modulePath: string,
  importFn: () => Promise<T>,
  options: {
    timeout?: number;
    fallback?: T;
  } = {}
): Promise<T> {
  const { timeout = 10000, fallback } = options;
  
  try {
    // 使用缓存的动态导入
    const result = await Promise.race([
      dynamicImportManager.importWithCache(modulePath, importFn),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Import timeout')), timeout)
      ),
    ]);
    
    return result;
  } catch (error) {
    logger.error('Performance import failed', error);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}
