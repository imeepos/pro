import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

type VendorFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type VendorFullscreenElement = Element & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

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
    const vendorDocument = document as VendorFullscreenDocument;
    return Boolean(
      document.fullscreenElement ||
      vendorDocument.webkitFullscreenElement ||
      vendorDocument.mozFullScreenElement ||
      vendorDocument.msFullscreenElement
    );
  }

  isFullscreenSupported(): boolean {
    const vendorDocument = document as VendorFullscreenDocument;
    return Boolean(
      document.fullscreenEnabled ||
      vendorDocument.webkitFullscreenEnabled ||
      vendorDocument.mozFullScreenEnabled ||
      vendorDocument.msFullscreenEnabled
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
      } else {
        const vendorTarget = targetElement as VendorFullscreenElement;
        if (vendorTarget.webkitRequestFullscreen) {
          await vendorTarget.webkitRequestFullscreen();
        } else if (vendorTarget.mozRequestFullScreen) {
          await vendorTarget.mozRequestFullScreen();
        } else if (vendorTarget.msRequestFullscreen) {
          await vendorTarget.msRequestFullscreen();
        }
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
      } else {
        const vendorDocument = document as VendorFullscreenDocument;
        if (vendorDocument.webkitExitFullscreen) {
          await vendorDocument.webkitExitFullscreen();
        } else if (vendorDocument.mozCancelFullScreen) {
          await vendorDocument.mozCancelFullScreen();
        } else if (vendorDocument.msExitFullscreen) {
          await vendorDocument.msExitFullscreen();
        }
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
