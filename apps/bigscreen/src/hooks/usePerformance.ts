/**
 * 性能监控React Hook
 * 提供组件级别的性能监控和优化建议
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { performanceMonitor, PerformanceReport, PerformanceMetric } from '@/utils/performance';
import { createLogger } from '@/utils/logger';

const logger = createLogger('usePerformance');

export interface UsePerformanceOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackUpdates?: boolean;
  warnOnSlowRender?: boolean;
  slowRenderThreshold?: number; // ms
}

export interface PerformanceStats {
  renderCount: number;
  averageRenderTime: number;
  slowRenders: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

/**
 * 组件性能监控Hook
 */
export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    componentName = 'UnknownComponent',
    trackRenders = true,
    warnOnSlowRender = true,
    slowRenderThreshold = 16, // 一帧的时间
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>();
  const mountTimeRef = useRef<number>();

  const [stats, setStats] = useState<PerformanceStats>({
    renderCount: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
  });

  // 记录组件挂载时间
  useEffect(() => {
    mountTimeRef.current = performance.now();
    logger.debug(`Component ${componentName} mounted`, {
      mountTime: mountTimeRef.current,
    });

    return () => {
      const unmountTime = performance.now();
      const lifespanTime = mountTimeRef.current ? unmountTime - mountTimeRef.current : 0;
      
      logger.debug(`Component ${componentName} unmounted`, {
        lifespan: lifespanTime,
        renderCount: renderCountRef.current,
        averageRenderTime: renderTimesRef.current.length > 0 
          ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
          : 0,
      });

      // 记录组件生命周期性能
      performanceMonitor.recordMetric({
        name: 'component.lifespan',
        value: lifespanTime,
        unit: 'ms',
        category: 'runtime',
        metadata: {
          component: componentName,
          renderCount: renderCountRef.current,
        },
      });
    };
  }, [componentName]);

  // 记录渲染开始时间
  const markRenderStart = useCallback(() => {
    if (trackRenders) {
      lastRenderStartRef.current = performance.now();
    }
  }, [trackRenders]);

  // 记录渲染结束时间
  const markRenderEnd = useCallback(() => {
    if (trackRenders && lastRenderStartRef.current) {
      const renderTime = performance.now() - lastRenderStartRef.current;
      renderCountRef.current += 1;
      renderTimesRef.current.push(renderTime);

      // 限制渲染时间数组大小
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-100);
      }

      // 记录到性能监控器
      performanceMonitor.recordComponentRender({
        componentName,
        renderTime,
        updateCount: renderCountRef.current,
        timestamp: Date.now(),
      });

      // 慢渲染警告
      if (warnOnSlowRender && renderTime > slowRenderThreshold) {
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          threshold: `${slowRenderThreshold}ms`,
          renderCount: renderCountRef.current,
        });
      }

      // 更新统计信息
      const totalRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0);
      const slowRenders = renderTimesRef.current.filter(time => time > slowRenderThreshold).length;

      setStats({
        renderCount: renderCountRef.current,
        averageRenderTime: totalRenderTime / renderTimesRef.current.length,
        slowRenders,
        lastRenderTime: renderTime,
        totalRenderTime,
      });

      lastRenderStartRef.current = undefined;
    }
  }, [trackRenders, componentName, warnOnSlowRender, slowRenderThreshold]);

  // 在每次渲染时自动记录
  useEffect(() => {
    markRenderStart();
    
    // 在下一个微任务中记录渲染结束时间
    Promise.resolve().then(() => {
      markRenderEnd();
    });
  });

  // 手动性能测量
  const measureFunction = useCallback(<T>(
    name: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> => {
    const fullName = `${componentName}.${name}`;
    const startTime = performance.now();

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.then(
          value => {
            const duration = performance.now() - startTime;
            performanceMonitor.recordMetric({
              name: fullName,
              value: duration,
              unit: 'ms',
              category: 'runtime',
              metadata: { component: componentName },
            });
            return value;
          },
          error => {
            const duration = performance.now() - startTime;
            performanceMonitor.recordMetric({
              name: `${fullName}.error`,
              value: duration,
              unit: 'ms',
              category: 'runtime',
              metadata: { component: componentName },
            });
            throw error;
          }
        );
      } else {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric({
          name: fullName,
          value: duration,
          unit: 'ms',
          category: 'runtime',
          metadata: { component: componentName },
        });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `${fullName}.error`,
        value: duration,
        unit: 'ms',
        category: 'runtime',
        metadata: { component: componentName },
      });
      throw error;
    }
  }, [componentName]);

  return {
    stats,
    markRenderStart,
    markRenderEnd,
    measureFunction,
  };
}

/**
 * API性能监控Hook
 */
export function useAPIPerformance() {
  const [apiStats, setApiStats] = useState({
    totalCalls: 0,
    averageDuration: 0,
    slowCalls: 0,
    errorCalls: 0,
  });

  const recordAPICall = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    size: number = 0
  ) => {
    performanceMonitor.recordAPICall({
      endpoint,
      method,
      duration,
      status,
      size,
      timestamp: Date.now(),
    });

    // 更新统计信息
    setApiStats(prev => ({
      totalCalls: prev.totalCalls + 1,
      averageDuration: (prev.averageDuration * prev.totalCalls + duration) / (prev.totalCalls + 1),
      slowCalls: prev.slowCalls + (duration > 2000 ? 1 : 0),
      errorCalls: prev.errorCalls + (status >= 400 ? 1 : 0),
    }));
  }, []);

  const measureAPICall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let status = 200;
    let size = 0;

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      // 估算响应大小
      if (result && typeof result === 'object') {
        size = JSON.stringify(result).length;
      }
      
      recordAPICall(endpoint, method, duration, status, size);
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      status = error.status || error.code || 500;
      recordAPICall(endpoint, method, duration, status, size);
      throw error;
    }
  }, [recordAPICall]);

  return {
    apiStats,
    recordAPICall,
    measureAPICall,
  };
}

/**
 * 全局性能监控Hook
 */
export function useGlobalPerformance() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<Record<string, number>>({});

  // 定期更新性能报告
  useEffect(() => {
    const updateReport = () => {
      const newReport = performanceMonitor.generateReport();
      const newMemoryUsage = performanceMonitor.getMemoryUsage();
      
      setReport(newReport);
      setMemoryUsage(newMemoryUsage);
    };

    // 立即更新一次
    updateReport();

    // 每30秒更新一次
    const interval = setInterval(updateReport, 30000);

    return () => clearInterval(interval);
  }, []);

  const getMetricsByCategory = useCallback((category: PerformanceMetric['category']) => {
    return performanceMonitor.getMetricsByCategory(category);
  }, []);

  const clearHistory = useCallback(() => {
    performanceMonitor.clearHistory();
    setReport(null);
    setMemoryUsage({});
  }, []);

  return {
    report,
    memoryUsage,
    getMetricsByCategory,
    clearHistory,
  };
}

/**
 * 页面加载性能Hook
 */
export function usePageLoadPerformance() {
  const [loadMetrics, setLoadMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    // 等待页面完全加载
    const updateLoadMetrics = () => {
      if (document.readyState === 'complete') {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            domParse: navigation.domInteractive - navigation.responseEnd,
            domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          };

          setLoadMetrics(metrics);
          
          logger.info('Page load metrics', metrics);
        }
      }
    };

    if (document.readyState === 'complete') {
      updateLoadMetrics();
    } else {
      window.addEventListener('load', updateLoadMetrics);
      return () => window.removeEventListener('load', updateLoadMetrics);
    }
  }, []);

  return loadMetrics;
}

/**
 * 资源加载性能Hook
 */
export function useResourcePerformance() {
  const [resourceStats, setResourceStats] = useState({
    totalResources: 0,
    totalSize: 0,
    largeResources: 0,
    slowResources: 0,
  });

  useEffect(() => {
    // 获取所有资源性能条目
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    let largeResources = 0;
    let slowResources = 0;

    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      const duration = resource.responseEnd - resource.startTime;

      totalSize += size;
      
      if (size > 1024 * 1024) { // 大于1MB
        largeResources++;
      }
      
      if (duration > 2000) { // 大于2秒
        slowResources++;
      }
    });

    setResourceStats({
      totalResources: resources.length,
      totalSize,
      largeResources,
      slowResources,
    });
  }, []);

  return resourceStats;
}
