import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare const initFlowbite: () => void;

@Injectable({
  providedIn: 'root'
})
export class FlowbiteService {
  private platformId = inject(PLATFORM_ID);

  /**
   * 初始化 Flowbite 组件
   * 应在应用启动时或动态内容加载后调用
   */
  initialize(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (typeof initFlowbite !== 'undefined') {
          initFlowbite();
        }
      } catch (error) {
        console.warn('Flowbite 初始化失败:', error);
      }
    }
  }

  /**
   * 重新初始化特定元素的 Flowbite 组件
   * 用于动态加载的内容
   */
  reinitialize(): void {
    this.initialize();
  }
}
