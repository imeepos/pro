import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Page, Browser, BrowserContext } from 'playwright';

import { WeiboCrawlerIntegrationTestBase } from '../weibo-crawler-test-base';
import { BrowserService } from '../../../src/browser/browser.service';
import { RobotsService } from '../../../src/robots/robots.service';
import { RequestMonitorService } from '../../../src/monitoring/request-monitor.service';

/**
 * 浏览器管理集成测试 - 数字时代的浏览器生命周期管理者
 *
 * 这个测试类验证浏览器管理的各个环节，确保每一个浏览器实例都能
 * 高效运行，每一次资源分配都经过精心设计。
 *
 * 测试覆盖：
 * - 浏览器实例的动态管理
 * - 页面加载性能的优化
 * - 资源拦截和智能控制
 * - 浏览器异常的优雅处理
 * - 并发浏览器的协调管理
 */
describe('BrowserManagementIntegrationTest', () => {
  let testSuite: WeiboCrawlerIntegrationTestBase;
  let browserService: BrowserService;
  let robotsService: RobotsService;
  let requestMonitorService: RequestMonitorService;

  let mockBrowser: jest.Mocked<Browser>;
  let mockContext: jest.Mocked<BrowserContext>;
  let mockPage: jest.Mocked<Page>;

  beforeAll(async () => {
    testSuite = new WeiboCrawlerIntegrationTestBase();
    await testSuite.createTestingModule();

    browserService = testSuite['browserService'];
    robotsService = testSuite['robotsService'];
    requestMonitorService = testSuite['requestMonitorService'];

    await setupMockBrowser();
  });

  afterAll(async () => {
    await testSuite.cleanupTestingModule();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  const setupMockBrowser = async () => {
    mockBrowser = {
      newContext: jest.fn(),
      close: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      version: jest.fn().mockResolvedValue('1.0.0'),
      contexts: jest.fn().mockReturnValue([])
    } as any;

    mockContext = {
      newPage: jest.fn(),
      close: jest.fn(),
      addCookies: jest.fn(),
      clearCookies: jest.fn(),
      route: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      setExtraHTTPHeaders: jest.fn(),
      setUserAgent: jest.fn(),
      viewport: jest.fn()
    } as any;

    mockPage = {
      goto: jest.fn(),
      content: jest.fn(),
      waitForSelector: jest.fn(),
      waitForLoadState: jest.fn(),
      close: jest.fn(),
      url: jest.fn(),
      title: jest.fn(),
      screenshot: jest.fn(),
      pdf: jest.fn(),
      evaluate: jest.fn(),
      addStyleTag: jest.fn(),
      addScriptTag: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      press: jest.fn(),
      hover: jest.fn(),
      scrollIntoViewIfNeeded: jest.fn(),
      setViewportSize: jest.fn(),
      emulateMedia: jest.fn(),
      bringToFront: jest.fn(),
      isClosed: jest.fn().mockReturnValue(false)
    } as any;

    mockBrowser.newContext.mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);

    jest.spyOn(browserService, 'getBrowser').mockResolvedValue(mockBrowser);
    jest.spyOn(browserService, 'createContext').mockResolvedValue(mockContext);
    jest.spyOn(browserService, 'createPage').mockResolvedValue(mockPage);
    jest.spyOn(browserService, 'closeContext').mockResolvedValue();
  };

  describe('浏览器实例管理', () => {
    it('应该能够创建新的浏览器上下文', async () => {
      const contextOptions = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN'
      };

      const context = await browserService.createContext(contextOptions);

      expect(context).toBeDefined();
      expect(mockBrowser.newContext).toHaveBeenCalledWith(contextOptions);
      expect(mockContext.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
    });

    it('应该能够关闭浏览器上下文', async () => {
      await browserService.closeContext(mockContext);

      expect(mockContext.close).toHaveBeenCalled();
    });

    it('应该能够管理多个并发的浏览器上下文', async () => {
      const contextCount = 5;
      const contexts: BrowserContext[] = [];

      for (let i = 0; i < contextCount; i++) {
        const context = await browserService.createContext();
        contexts.push(context);
      }

      expect(contexts.length).toBe(contextCount);
      expect(mockBrowser.newContext).toHaveBeenCalledTimes(contextCount);

      // Close all contexts
      for (const context of contexts) {
        await browserService.closeContext(context);
      }

      expect(mockContext.close).toHaveBeenCalledTimes(contextCount);
    });

    it('应该能够检测浏览器连接状态', async () => {
      const isConnected = await browserService.isBrowserConnected();
      expect(isConnected).toBe(true);
      expect(mockBrowser.isConnected).toHaveBeenCalled();
    });

    it('应该能够重启浏览器实例', async () => {
      const newMockBrowser = { ...mockBrowser, version: jest.fn().mockResolvedValue('2.0.0') };

      jest.spyOn(browserService, 'restartBrowser').mockResolvedValue(newMockBrowser as any);

      const restartedBrowser = await browserService.restartBrowser();
      expect(restartedBrowser).toBeDefined();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('应该能够设置浏览器全局配置', async () => {
      const globalConfig = {
        defaultTimeout: 60000,
        ignoreHTTPSErrors: true,
        headless: true
      };

      await browserService.setGlobalConfig(globalConfig);

      expect(mockContext.setDefaultNavigationTimeout).toHaveBeenCalledWith(globalConfig.defaultTimeout);
    });
  });

  describe('页面加载性能测试', () => {
    it('应该能够测量页面加载时间', async () => {
      const url = 'https://weibo.com/test';
      const startTime = Date.now();

      mockPage.goto.mockImplementation(async () => {
        // Simulate page load time
        await new Promise(resolve => setTimeout(resolve, 100));
        return null;
      });

      mockPage.waitForLoadState.mockResolvedValue();

      const page = await browserService.createPage();
      await page.goto(url);

      const loadTime = Date.now() - startTime;

      expect(mockPage.goto).toHaveBeenCalledWith(url, expect.any(Object));
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
      expect(loadTime).toBeGreaterThan(90);
    });

    it('应该能够优化页面加载策略', async () => {
      const url = 'https://weibo.com/optimized';

      const optimizedOptions = {
        waitUntil: 'domcontentloaded' as const,
        timeout: 15000
      };

      const page = await browserService.createPage();
      await page.goto(url, optimizedOptions);

      expect(mockPage.goto).toHaveBeenCalledWith(url, optimizedOptions);
    });

    it('应该能够处理页面加载超时', async () => {
      const url = 'https://weibo.com/slow';

      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      const page = await browserService.createPage();

      try {
        await page.goto(url, { timeout: 5000 });
      } catch (error) {
        expect(error.message).toContain('Timeout');
      }

      expect(mockPage.goto).toHaveBeenCalledWith(url, expect.objectContaining({ timeout: 5000 }));
    });

    it('应该能够监控页面资源加载', async () => {
      const page = await browserService.createPage();

      // Mock resource monitoring
      const resourceMonitor = jest.fn();
      mockPage.on.mockImplementation((event, handler) => {
        if (event === 'response') {
          resourceMonitor('response received');
        }
      });

      await browserService.enableResourceMonitoring(page);

      expect(resourceMonitor).toHaveBeenCalled();
    });

    it('应该能够优化重试策略', async () => {
      const url = 'https://weibo.com/flaky';
      let attemptCount = 0;

      mockPage.goto.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return null;
      });

      const page = await browserService.createPage();
      await browserService.loadPageWithRetry(page, url, { maxRetries: 3 });

      expect(mockPage.goto).toHaveBeenCalledTimes(3);
      expect(attemptCount).toBe(3);
    });
  });

  describe('资源拦截和优化', () => {
    it('应该能够拦截不必要的资源', async () => {
      const context = await browserService.createContext();

      const blockedResources = ['image', 'stylesheet', 'font'];

      await browserService.blockResources(context, blockedResources);

      expect(mockContext.route).toHaveBeenCalledTimes(blockedResources.length);

      // Verify route handler was set up correctly
      const routeCall = mockContext.route.mock.calls[0];
      expect(routeCall[0]).toBe('**/*.{png,jpg,jpeg,gif,css,woff,woff2}');
      expect(typeof routeCall[1]).toBe('function');
    });

    it('应该能够缓存静态资源', async () => {
      const context = await browserService.createContext();

      await browserService.enableResourceCaching(context);

      expect(mockContext.route).toHaveBeenCalledWith('**/*.{js,css,png,jpg,jpeg,gif,svg,woff,woff2}', expect.any(Function));
    });

    it('应该能够自定义请求头', async () => {
      const context = await browserService.createContext();

      const customHeaders = {
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      };

      await browserService.setCustomHeaders(context, customHeaders);

      expect(mockContext.setExtraHTTPHeaders).toHaveBeenCalledWith(customHeaders);
    });

    it('应该能够模拟用户代理', async () => {
      const context = await browserService.createContext();

      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';

      await browserService.setUserAgent(context, userAgent);

      expect(mockContext.setUserAgent).toHaveBeenCalledWith(userAgent);
    });

    it('应该能够处理Cookie管理', async () => {
      const context = await browserService.createContext();

      const cookies = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: '.weibo.com',
          path: '/'
        }
      ];

      await browserService.setCookies(context, cookies);
      expect(mockContext.addCookies).toHaveBeenCalledWith(cookies);

      await browserService.clearCookies(context);
      expect(mockContext.clearCookies).toHaveBeenCalled();
    });

    it('应该能够注入自定义脚本', async () => {
      const page = await browserService.createPage();

      const customScript = `
        window.__test_data__ = { test: 'injection_success' };
        console.log('Custom script injected');
      `;

      await browserService.injectScript(page, customScript);

      expect(mockPage.addScriptTag).toHaveBeenCalledWith({ content: customScript });
    });

    it('应该能够注入自定义样式', async () => {
      const page = await browserService.createPage();

      const customStyles = `
        .hidden-element { display: none !important; }
        .highlighted-element { border: 2px solid red !important; }
      `;

      await browserService.injectStyles(page, customStyles);

      expect(mockPage.addStyleTag).toHaveBeenCalledWith({ content: customStyles });
    });
  });

  describe('浏览器异常处理', () => {
    it('应该能够处理页面崩溃', async () => {
      const page = await browserService.createPage();

      // Mock page crash
      mockPage.goto.mockRejectedValue(new Error('Page crashed'));

      const recovered = await browserService.handlePageCrash(page);
      expect(recovered).toBe(true);
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('应该能够处理内存泄漏', async () => {
      const context = await browserService.createContext();

      // Mock memory usage monitoring
      const memoryMonitor = jest.fn().mockResolvedValue({
        jsHeapSizeLimit: 2048000000,
        totalJSHeapSize: 500000000,
        usedJSHeapSize: 450000000
      });

      jest.spyOn(browserService, 'getMemoryUsage').mockImplementation(memoryMonitor);

      const memoryUsage = await browserService.getMemoryUsage(context);
      expect(memoryUsage).toBeDefined();
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(memoryUsage.jsHeapSizeLimit);
    });

    it('应该能够处理网络连接中断', async () => {
      const page = await browserService.createPage();

      mockPage.goto.mockRejectedValue(new Error('net::ERR_NETWORK_DISCONNECTED'));

      const reconnected = await browserService.handleNetworkDisconnection(page);
      expect(reconnected).toBe(true);
    });

    it('应该能够处理浏览器进程退出', async () => {
      mockBrowser.isConnected.mockReturnValue(false);

      const recovered = await browserService.handleBrowserExit();
      expect(recovered).toBe(true);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('应该能够处理权限被拒绝的错误', async () => {
      const page = await browserService.createPage();

      mockPage.goto.mockRejectedValue(new Error('Permission denied'));

      const handled = await browserService.handlePermissionDenied(page);
      expect(handled).toBe(true);
    });

    it('应该能够记录和分析错误', async () => {
      const page = await browserService.createPage();
      const error = new Error('Test error');

      const errorLogger = jest.spyOn(browserService, 'logError').mockResolvedValue();

      await browserService.handleError(page, error);

      expect(errorLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          error: error.message,
          url: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('并发浏览器管理', () => {
    it('应该能够管理多个并发的页面实例', async () => {
      const pageCount = 10;
      const pages: Page[] = [];
      const promises: Promise<Page>[] = [];

      // Create multiple pages concurrently
      for (let i = 0; i < pageCount; i++) {
        promises.push(browserService.createPage());
      }

      const createdPages = await Promise.all(promises);
      pages.push(...createdPages);

      expect(pages.length).toBe(pageCount);
      expect(mockContext.newPage).toHaveBeenCalledTimes(pageCount);

      // Use pages concurrently
      const loadPromises = pages.map((page, index) =>
        page.goto(`https://weibo.com/test${index}`)
      );

      await Promise.all(loadPromises);
      expect(mockPage.goto).toHaveBeenCalledTimes(pageCount);

      // Clean up
      const closePromises = pages.map(page => browserService.closePage(page));
      await Promise.all(closePromises);
    });

    it('应该能够限制并发浏览器数量', async () => {
      const maxConcurrent = 3;
      const totalPages = 10;
      const pages: Page[] = [];

      jest.spyOn(browserService, 'getActivePageCount').mockReturnValue(maxConcurrent);

      for (let i = 0; i < totalPages; i++) {
        if (await browserService.canCreateNewPage()) {
          const page = await browserService.createPage();
          pages.push(page);
        }
      }

      expect(pages.length).toBeLessThanOrEqual(maxConcurrent);
    });

    it('应该能够分配不同的浏览器实例给不同任务', async () => {
      const tasks = ['search', 'detail', 'user_profile'];
      const taskBrowsers: Browser[] = [];

      for (const task of tasks) {
        const browser = await browserService.getBrowserForTask(task);
        taskBrowsers.push(browser);
      }

      expect(taskBrowsers.length).toBe(tasks.length);
      taskBrowsers.forEach(browser => {
        expect(browser).toBeDefined();
      });
    });

    it('应该能够监控浏览器资源使用情况', async () => {
      const resourceStats = await browserService.getResourceStats();

      expect(resourceStats).toBeDefined();
      expect(resourceStats).toHaveProperty('activePages');
      expect(resourceStats).toHaveProperty('activeContexts');
      expect(resourceStats).toHaveProperty('memoryUsage');
      expect(resourceStats).toHaveProperty('cpuUsage');
    });

    it('应该能够优雅地关闭所有浏览器实例', async () => {
      const context1 = await browserService.createContext();
      const context2 = await browserService.createContext();
      const page1 = await browserService.createPage(context1);
      const page2 = await browserService.createPage(context2);

      await browserService.shutdownAll();

      expect(mockPage.close).toHaveBeenCalledTimes(2);
      expect(mockContext.close).toHaveBeenCalledTimes(2);
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('性能优化测试', () => {
    it('应该能够启用页面预加载', async () => {
      const page = await browserService.createPage();

      await browserService.enablePagePreloading(page);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.stringContaining('preload'));
    });

    it('应该能够优化图片加载', async () => {
      const page = await browserService.createPage();

      await browserService.optimizeImageLoading(page);

      expect(mockPage.addStyleTag).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('img')
        })
      );
    });

    it('应该能够启用虚拟滚动', async () => {
      const page = await browserService.createPage();

      await browserService.enableVirtualScrolling(page);

      expect(mockPage.addScriptTag).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('virtual-scroll')
        })
      );
    });

    it('应该能够压缩页面内容', async () => {
      const page = await browserService.createPage();

      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="content">大量内容...</div>
            <script>console.log('test');</script>
            <style>body { margin: 0; }</style>
          </body>
        </html>
      `);

      const compressedContent = await browserService.compressPageContent(page);

      expect(compressedContent).toBeDefined();
      expect(compressedContent.length).toBeLessThan(mockPage.content.mock.results[0].value.length);
    });

    it('应该能够实现智能等待策略', async () => {
      const page = await browserService.createPage();

      mockPage.waitForSelector.mockResolvedValue(true as any);

      const waitResult = await browserService.smartWait(page, '.target-element', {
        timeout: 5000,
        pollInterval: 100
      });

      expect(waitResult).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.target-element', {
        timeout: 5000
      });
    });

    it('应该能够缓存页面状态', async () => {
      const page = await browserService.createPage();
      const stateKey = 'weibo_search_page';

      const pageState = {
        scrollPosition: { x: 0, y: 500 },
        formValues: { keyword: 'test' },
        timestamp: Date.now()
      };

      await browserService.savePageState(page, stateKey, pageState);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.stringContaining('localStorage'),
        expect.anything()
      );

      const restoredState = await browserService.restorePageState(page, stateKey);
      expect(restoredState).toEqual(pageState);
    });
  });

  describe('安全和隐私测试', () => {
    it('应该能够启用无痕模式', async () => {
      const context = await browserService.createContext({ incognito: true });

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({ incognito: true })
      );
    });

    it('应该能够禁用跟踪功能', async () => {
      const context = await browserService.createContext();

      await browserService.disableTracking(context);

      expect(mockContext.route).toHaveBeenCalledWith('**/*analytics*', expect.any(Function));
      expect(mockContext.route).toHaveBeenCalledWith('**/*tracking*', expect.any(Function));
    });

    it('应该能够设置隐私保护模式', async () => {
      const context = await browserService.createContext();

      await browserService.enablePrivacyMode(context);

      expect(mockContext.addCookies).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'privacy_mode', value: 'enabled' })
      ]);
    });

    it('应该能够清理敏感数据', async () => {
      const page = await browserService.createPage();

      await browserService.clearSensitiveData(page);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.stringContaining('localStorage.clear')
      );
      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.stringContaining('sessionStorage.clear')
      );
    });
  });
});