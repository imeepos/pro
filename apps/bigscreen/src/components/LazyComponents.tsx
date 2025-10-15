/**
 * 懒加载组件定义
 * 实现组件级别的代码分割和按需加载
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// ================== 页面级懒加载 ==================

export const DataOverviewPage = lazy(() => 
  import('../pages/DataOverview')
);

export const EventAnalysisPage = lazy(() => 
  import('../pages/EventAnalysis')
);

export const EventDetailPage = lazy(() => 
  import('../pages/EventDetail')
);

export const UserDetectionPage = lazy(() => 
  import('../pages/UserDetection')
);

// ================== 图表组件懒加载 ==================

export const SentimentTrendChart = lazy(() => 
  import('./charts/SentimentTrendChart').then(module => ({ default: module.default }))
);

export const WordCloudChart = lazy(() => 
  import('./charts/WordCloudChart').then(module => ({ default: module.default }))
);

export const GeographicChart = lazy(() => 
  import('./charts/GeographicChart').then(module => ({ default: module.default }))
);

export const HotTopicsChart = lazy(() => 
  import('./charts/HotTopicsChart').then(module => ({ default: module.default }))
);

export const EventTypeBarChart = lazy(() => 
  import('./charts/EventTypeBarChart').then(module => ({ default: module.default }))
);

export const TimeSeriesChart = lazy(() => 
  import('./charts/TimeSeriesChart').then(module => ({ default: module.default }))
);

export const LocationHeatMap = lazy(() => 
  import('./charts/LocationHeatMap').then(module => ({ default: module.default }))
);

export const SentimentPieChart = lazy(() => 
  import('./charts/SentimentPieChart').then(module => ({ default: module.default }))
);

export const SimpleSentimentPieChart = lazy(() => 
  import('./charts/SimpleSentimentPieChart').then(module => ({ default: module.default }))
);

export const EmotionCurveChart = lazy(() => 
  import('./charts/EmotionCurveChart').then(module => ({ default: module.default }))
);

export const EventCountChart = lazy(() => 
  import('./charts/EventCountChart').then(module => ({ default: module.default }))
);

export const PostCountChart = lazy(() => 
  import('./charts/PostCountChart').then(module => ({ default: module.default }))
);

export const HotEventsList = lazy(() => 
  import('./charts/HotEventsList').then(module => ({ default: module.default }))
);

// ================== UI组件懒加载 ==================

export const PerformanceDashboard = lazy(() => 
  import('./ui/PerformanceDashboard').then(module => ({ default: module.PerformanceDashboard }))
);

export const ErrorNotification = lazy(() => 
  import('./ui/ErrorNotification').then(module => ({ default: module.ErrorNotification }))
);

// ================== 懒加载工具函数 ==================

/**
 * 创建带重试机制的懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): LazyExoticComponent<T> {
  return lazy(() => {
    let retryCount = 0;
    
    const loadWithRetry = async (): Promise<{ default: T }> => {
      try {
        return await factory();
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Component load failed, retrying... (${retryCount}/${maxRetries})`, error);
          
          // 延迟重试
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return loadWithRetry();
        }
        throw error;
      }
    };
    
    return loadWithRetry();
  });
}

/**
 * 预加载组件
 */
export function preloadComponent(factory: () => Promise<any>): Promise<any> {
  return factory();
}

/**
 * 批量预加载组件
 */
export function preloadComponents(factories: (() => Promise<any>)[]): Promise<any[]> {
  return Promise.all(factories.map(factory => 
    factory().catch(error => {
      console.warn('Failed to preload component:', error);
      return null;
    })
  ));
}

// ================== 预加载策略 ==================

/**
 * 关键组件预加载
 * 在应用启动时预加载重要组件
 */
export function preloadCriticalComponents(): Promise<any[]> {
  return preloadComponents([
    () => import('./ui/StatsOverview'),
    () => import('./charts/SentimentTrendChart'),
    () => import('./charts/SentimentPieChart'),
  ]);
}

/**
 * 图表组件预加载
 * 在用户可能访问图表页面时预加载
 */
export function preloadChartComponents(): Promise<any[]> {
  return preloadComponents([
    () => import('./charts/WordCloudChart'),
    () => import('./charts/GeographicChart'),
    () => import('./charts/EventTypeBarChart'),
    () => import('./charts/TimeSeriesChart'),
  ]);
}

/**
 * 页面组件预加载
 * 在路由切换前预加载
 */
export function preloadPageComponents(): Promise<any[]> {
  return preloadComponents([
    () => import('../pages/DataOverview'),
    () => import('../pages/EventAnalysis'),
    () => import('../pages/EventDetail'),
    () => import('../pages/UserDetection'),
  ]);
}

// ================== 组件懒加载映射 ==================

/**
 * 懒加载组件注册表
 * 用于动态加载组件
 */
export const LAZY_COMPONENT_MAP = {
  // 页面组件
  'DataOverview': DataOverviewPage,
  'EventAnalysis': EventAnalysisPage,
  'EventDetail': EventDetailPage,
  'UserDetection': UserDetectionPage,
  
  // 图表组件
  SentimentTrendChart,
  WordCloudChart,
  GeographicChart,
  HotTopicsChart,
  EventTypeBarChart,
  TimeSeriesChart,
  LocationHeatMap,
  SentimentPieChart,
  SimpleSentimentPieChart,
  EmotionCurveChart,
  EventCountChart,
  PostCountChart,
  HotEventsList,
  
  // UI组件
  PerformanceDashboard,
  ErrorNotification,
} as const;

/**
 * 获取懒加载组件
 */
export function getLazyComponent(name: keyof typeof LAZY_COMPONENT_MAP) {
  return LAZY_COMPONENT_MAP[name];
}

/**
 * 动态导入组件
 */
export async function importComponent(name: string): Promise<ComponentType<any> | null> {
  try {
    switch (name) {
      case 'DataOverview':
        return (await import('../pages/DataOverview')).default;
      case 'EventAnalysis':
        return (await import('../pages/EventAnalysis')).default;
      case 'EventDetail':
        return (await import('../pages/EventDetail')).default;
      case 'UserDetection':
        return (await import('../pages/UserDetection')).default;
      default:
        console.warn(`Unknown component: ${name}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to import component ${name}:`, error);
    return null;
  }
}

// ================== 路由级代码分割 ==================

/**
 * 路由懒加载配置
 */
export const ROUTE_COMPONENTS = {
  '/': DataOverviewPage,
  '/overview': DataOverviewPage,
  '/events': EventAnalysisPage,
  '/events/:id': EventDetailPage,
  '/users': UserDetectionPage,
} as const;