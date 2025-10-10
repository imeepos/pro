import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FullscreenService {
  private isFullscreenSubject = new BehaviorSubject<boolean>(false);
  readonly isFullscreen$: Observable<boolean> = this.isFullscreenSubject.asObservable();

  constructor() {
    this.setupFullscreenListener();
  }

  private setupFullscreenListener(): void {
    fromEvent(document, 'fullscreenchange').subscribe(() => {
      this.isFullscreenSubject.next(this.isFullscreenActive());
    });
  }

  private isFullscreenActive(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }

  isFullscreenSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  async enterFullscreen(element?: HTMLElement): Promise<void> {
    const targetElement = element || document.documentElement;

    if (!this.isFullscreenSupported()) {
      throw new Error('浏览器不支持全屏API');
    }

    try {
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen();
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen();
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen();
      }
      this.isFullscreenSubject.next(true);
    } catch (error) {
      console.error('进入全屏失败:', error);
      throw error;
    }
  }

  async exitFullscreen(): Promise<void> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      this.isFullscreenSubject.next(false);
    } catch (error) {
      console.error('退出全屏失败:', error);
      throw error;
    }
  }

  async toggleFullscreen(element?: HTMLElement): Promise<void> {
    if (this.isFullscreenActive()) {
      await this.exitFullscreen();
    } else {
      await this.enterFullscreen(element);
    }
  }

  get isFullscreen(): boolean {
    return this.isFullscreenSubject.value;
  }
}
