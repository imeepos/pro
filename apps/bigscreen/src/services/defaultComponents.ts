/**
 * 默认组件注册
 * 注册系统内置的可视化组件
 */

import React from 'react';
import { registerComponents, componentRegistry } from './ComponentRegistry';
import { createLogger } from '@/utils/logger';
import { ComponentConfig } from '../types/layout';

// 使用静态导入以避免动态导入警告
import SentimentTrendChart from '../components/charts/SentimentTrendChart';
import WordCloudChart from '../components/charts/WordCloudChart';
import GeographicChart from '../components/charts/GeographicChart';
import HotTopicsChart from '../components/charts/HotTopicsChart';
import StatsOverview from '../components/ui/StatsOverview';
import SentimentPieChart from '../components/charts/SentimentPieChart';
import EventTypeBarChart from '../components/charts/EventTypeBarChart';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import LocationHeatMap from '../components/charts/LocationHeatMap';
import MiniTrendChart from '../components/charts/MiniTrendChart';
import EmptyWidget from '../components/ui/EmptyWidget';

// 组件映射表
const componentMap: Record<string, React.ComponentType<any>> = {
  SentimentTrendChart,
  WordCloudChart,
  GeographicChart,
  HotTopicsChart,
  StatsOverview,
  SentimentPieChart,
  EventTypeBarChart,
  TimeSeriesChart,
  LocationHeatMap,
  MiniTrendChart,
  EmptyWidget
};

// 获取组件实例
const getComponent = (componentName: string): React.ComponentType<any> => {
  const component = componentMap[componentName];
  if (!component) {
    // 返回一个占位组件
    return () => React.createElement('div', {
      className: 'p-4 bg-gray-100 rounded text-center text-gray-500'
    }, `未知组件: ${componentName}`);
  }
  return component;
};

// 默认组件配置
const defaultComponentConfigs: Array<{
  name: string;
  config: ComponentConfig;
}> = [
  {
    name: 'SentimentTrendChart',
    config: {
      displayName: '情感趋势图',
      category: 'analytics',
      description: '显示舆情情感随时间变化的趋势分析',
      icon: '📈',
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 12, h: 8 },
      defaultProps: { height: 300 }
    }
  },
  {
    name: 'WordCloudChart',
    config: {
      displayName: '词云图',
      category: 'analytics',
      description: '关键词频次分布可视化，展现热点话题',
      icon: '☁️',
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 12, h: 8 },
      defaultProps: { height: 300, maxWords: 100 }
    }
  },
  {
    name: 'GeographicChart',
    config: {
      displayName: '地理分布图',
      category: 'geographic',
      description: '展示事件或用户的地理位置分布情况',
      icon: '🗺️',
      defaultSize: { w: 8, h: 6 },
      minSize: { w: 6, h: 4 },
      maxSize: { w: 12, h: 10 },
      defaultProps: { height: 400 }
    }
  },
  {
    name: 'HotTopicsChart',
    config: {
      displayName: '热点话题',
      category: 'events',
      description: '实时热点话题列表，按热度排序展示',
      icon: '🔥',
      defaultSize: { w: 4, h: 6 },
      minSize: { w: 3, h: 4 },
      maxSize: { w: 8, h: 12 },
      defaultProps: { maxItems: 10 }
    }
  },
  {
    name: 'StatsOverview',
    config: {
      displayName: '数据概览',
      category: 'overview',
      description: '关键指标概览面板，显示核心数据统计',
      icon: '📊',
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 6, h: 2 },
      maxSize: { w: 12, h: 4 },
      defaultProps: {}
    }
  },
  {
    name: 'SentimentPieChart',
    config: {
      displayName: '情感分布饼图',
      category: 'analytics',
      description: '显示正面、负面、中性情感的分布比例',
      icon: '🥧',
      defaultSize: { w: 4, h: 4 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 8 },
      defaultProps: { height: 300 }
    }
  },
  {
    name: 'EventTypeBarChart',
    config: {
      displayName: '事件类型柱状图',
      category: 'events',
      description: '按事件类型统计显示数据分布',
      icon: '📊',
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 12, h: 8 },
      defaultProps: { height: 300 }
    }
  },
  {
    name: 'TimeSeriesChart',
    config: {
      displayName: '时间序列图',
      category: 'analytics',
      description: '展示数据随时间的变化趋势',
      icon: '⏱️',
      defaultSize: { w: 8, h: 4 },
      minSize: { w: 6, h: 3 },
      maxSize: { w: 12, h: 8 },
      defaultProps: { height: 300 }
    }
  },
  {
    name: 'LocationHeatMap',
    config: {
      displayName: '位置热力图',
      category: 'geographic',
      description: '以热力图形式展示地理位置数据密度',
      icon: '🌡️',
      defaultSize: { w: 8, h: 6 },
      minSize: { w: 6, h: 4 },
      maxSize: { w: 12, h: 10 },
      defaultProps: { height: 400 }
    }
  },
  {
    name: 'MiniTrendChart',
    config: {
      displayName: '迷你趋势图',
      category: 'overview',
      description: '小型趋势图，适用于仪表板概览',
      icon: '📉',
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
      maxSize: { w: 6, h: 4 },
      defaultProps: { height: 150 }
    }
  },
  {
    name: 'EmptyWidget',
    config: {
      displayName: '空白组件',
      category: 'utility',
      description: '占位组件，用于布局规划',
      icon: '📦',
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 12, h: 12 },
      defaultProps: { 
        placeholder: '点击选择组件',
        showBorder: true 
      }
    }
  }
];

/**
 * 初始化默认组件注册
 */
export function initializeDefaultComponents() {
  const logger = createLogger('DefaultComponents');
  
  // 检查是否已经初始化过
  if (componentRegistry.size() > 0) {
    logger.debug('Components already initialized, skipping...');
    return;
  }

  const componentsToRegister = defaultComponentConfigs.map(({ name, config }) => ({
    name,
    component: getComponent(name),
    config
  }));

  registerComponents(componentsToRegister);
  
  logger.debug(`Registered ${componentsToRegister.length} default components`);
}

/**
 * 获取所有默认组件的配置信息
 */
export function getDefaultComponentConfigs() {
  return defaultComponentConfigs;
}

/**
 * 获取指定类别的默认组件
 */
export function getDefaultComponentsByCategory(category: string) {
  return defaultComponentConfigs.filter(config => config.config.category === category);
}

/**
 * 获取所有默认组件类别
 */
export function getDefaultComponentCategories() {
  const categories = new Set(defaultComponentConfigs.map(config => config.config.category));
  return Array.from(categories).sort();
}

// 导出组件名称常量
export const DEFAULT_COMPONENTS = {
  SENTIMENT_TREND_CHART: 'SentimentTrendChart',
  WORD_CLOUD_CHART: 'WordCloudChart',
  GEOGRAPHIC_CHART: 'GeographicChart',
  HOT_TOPICS_CHART: 'HotTopicsChart',
  STATS_OVERVIEW: 'StatsOverview',
  SENTIMENT_PIE_CHART: 'SentimentPieChart',
  EVENT_TYPE_BAR_CHART: 'EventTypeBarChart',
  TIME_SERIES_CHART: 'TimeSeriesChart',
  LOCATION_HEAT_MAP: 'LocationHeatMap',
  MINI_TREND_CHART: 'MiniTrendChart',
  EMPTY_WIDGET: 'EmptyWidget'
} as const;

export type DefaultComponentName = typeof DEFAULT_COMPONENTS[keyof typeof DEFAULT_COMPONENTS];