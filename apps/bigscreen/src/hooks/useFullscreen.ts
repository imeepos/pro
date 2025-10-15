import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/utils/logger';

interface FullscreenAPI {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface DocumentFullscreenAPI {
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

const logger = createLogger('useFullscreen');

/**
 * 全屏功能 Hook
 * 提供进入/退出全屏、检测全屏状态等功能
 */
export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // 检查浏览器是否支持全屏API
  useEffect(() => {
    const element = document.documentElement as Element & FullscreenAPI;
    const supported = !!(
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen
    );
    setIsSupported(supported);
  }, []);

  // 检查当前是否处于全屏状态
  const checkFullscreenStatus = useCallback(() => {
    const doc = document as Document & DocumentFullscreenAPI;
    const fullscreenElement = 
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;
    
    setIsFullscreen(!!fullscreenElement);
  }, []);

  // 监听全屏状态变化
  useEffect(() => {
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    events.forEach(event => {
      document.addEventListener(event, checkFullscreenStatus);
    });

    // 初始检查
    checkFullscreenStatus();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, checkFullscreenStatus);
      });
    };
  }, [checkFullscreenStatus]);

  // 进入全屏
  const enterFullscreen = useCallback(async (element?: Element) => {
    if (!isSupported) {
      logger.warn('浏览器不支持全屏API');
      return false;
    }

    try {
      const targetElement = (element || document.documentElement) as Element & FullscreenAPI;
      
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if (targetElement.webkitRequestFullscreen) {
        await targetElement.webkitRequestFullscreen();
      } else if (targetElement.mozRequestFullScreen) {
        await targetElement.mozRequestFullScreen();
      } else if (targetElement.msRequestFullscreen) {
        await targetElement.msRequestFullscreen();
      }
      
      return true;
    } catch (error) {
      logger.error('进入全屏失败:', error);
      return false;
    }
  }, [isSupported]);

  // 退出全屏
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) {
      logger.warn('浏览器不支持全屏API');
      return false;
    }

    try {
      const doc = document as Document & DocumentFullscreenAPI;
      
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      
      return true;
    } catch (error) {
      logger.error('退出全屏失败:', error);
      return false;
    }
  }, [isSupported]);

  // 切换全屏状态
  const toggleFullscreen = useCallback(async (element?: Element) => {
    if (isFullscreen) {
      return await exitFullscreen();
    } else {
      return await enterFullscreen(element);
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
};
