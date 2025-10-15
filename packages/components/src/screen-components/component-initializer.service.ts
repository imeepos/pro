import { Injectable } from '@angular/core';
import { ComponentRegistryService } from './base/component-registry.service';
import { ComponentMetadata } from './base/component-metadata.interface';
import { WeiboLoggedInUsersCardComponent } from './weibo/weibo-logged-in-users-card.component';
import { EventMapDistributionComponent, HotEventsRankingComponent } from './events/index';
import { WordCloudStatisticsComponent } from './charts/word-cloud-statistics.component';

@Injectable({
  providedIn: 'root'
})
export class ComponentInitializerService {

  constructor(private componentRegistry: ComponentRegistryService) {}

  /**
   * 初始化并注册所有可用的屏幕组件
   */
  initializeComponents(): void {
    this.registerWeiboComponents();
    this.registerEventComponents();
    this.registerChartComponents();
    // 在这里添加其他组件类别的注册
  }

  /**
   * 注册微博相关组件
   */
  private registerWeiboComponents(): void {
    // 注册微博已登录用户统计卡片组件
    const weiboUsersCardMetadata: ComponentMetadata = {
      type: 'weibo-logged-in-users-card',
      name: '微博已登录用户统计',
      category: '微博数据',
      icon: '👥',
      description: '显示微博平台已登录用户的统计信息，包括总用户数、今日新增和在线用户数',
      configSchema: {
        mode: {
          type: 'select',
          label: '显示模式',
          options: [
            { value: 'edit', label: '编辑模式' },
            { value: 'display', label: '展示模式' }
          ],
          default: 'display'
        },
        title: {
          type: 'text',
          label: '标题',
          default: '微博已登录用户统计'
        },
        showTotal: {
          type: 'boolean',
          label: '显示总用户数',
          default: true
        },
        showTodayNew: {
          type: 'boolean',
          label: '显示今日新增',
          default: true
        },
        showOnline: {
          type: 'boolean',
          label: '显示在线用户',
          default: true
        },
        theme: {
          type: 'select',
          label: '主题色彩',
          options: [
            { value: 'default', label: '默认' },
            { value: 'blue', label: '蓝色' },
            { value: 'green', label: '绿色' },
            { value: 'purple', label: '紫色' },
            { value: 'orange', label: '橙色' }
          ],
          default: 'default'
        },
        refreshInterval: {
          type: 'number',
          label: '刷新间隔(毫秒)',
          default: 30000,
          min: 0
        },
        showIcons: {
          type: 'boolean',
          label: '显示图标',
          default: true
        },
        enableAnimation: {
          type: 'boolean',
          label: '启用动画',
          default: true
        },
        showErrorHandling: {
          type: 'boolean',
          label: '显示错误处理',
          default: true
        },
        showTrends: {
          type: 'boolean',
          label: '显示趋势',
          default: true
        },
        showUpdateTime: {
          type: 'boolean',
          label: '显示更新时间',
          default: true
        }
      },
      defaultConfig: {
        mode: 'display',
        title: '微博已登录用户统计',
        showTotal: true,
        showTodayNew: true,
        showOnline: true,
        theme: 'default',
        refreshInterval: 30000,
        showIcons: true,
        enableAnimation: true,
        showErrorHandling: true,
        showTrends: true,
        showUpdateTime: true
      }
    };

    this.componentRegistry.register(weiboUsersCardMetadata, WeiboLoggedInUsersCardComponent);
  }

  /**
   * 注册事件可视化组件
   */
  private registerEventComponents(): void {
    // 注册事件地图分布组件
    const eventMapMetadata: ComponentMetadata = {
      type: 'event-map-distribution',
      name: '事件地图分布',
      category: '事件分析',
      icon: '🧭',
      description: '以地图形态呈现事件的地域分布，支持聚合、区域概览与最新事件高亮',
      configSchema: {
        mode: {
          type: 'select',
          label: '显示模式',
          options: [
            { value: 'edit', label: '编辑模式' },
            { value: 'display', label: '展示模式' }
          ],
          default: 'display'
        },
        title: {
          type: 'text',
          label: '标题',
          default: '事件地图分布',
          placeholder: '如：全国舆情热度地图'
        },
        mapTheme: {
          type: 'select',
          label: '地图主题',
          options: [
            { value: 'midnight', label: '午夜星图' },
            { value: 'ocean', label: '深海蓝' },
            { value: 'sunrise', label: '晨曦暖光' },
            { value: 'minimal', label: '极简浅色' }
          ],
          default: 'midnight'
        },
        maxEvents: {
          type: 'number',
          label: '最大事件数量',
          min: 10,
          max: 500,
          step: 10,
          default: 200
        },
        refreshInterval: {
          type: 'number',
          label: '刷新间隔(毫秒)',
          min: 0,
          step: 1000,
          default: 60000
        },
        autoFit: {
          type: 'boolean',
          label: '自动适应视图',
          default: true
        },
        enableCluster: {
          type: 'boolean',
          label: '启用聚合气泡',
          default: true
        },
        showLegend: {
          type: 'boolean',
          label: '显示图例',
          default: true
        },
        showSummary: {
          type: 'boolean',
          label: '显示区域统计',
          default: true
        },
        highlightLatest: {
          type: 'boolean',
          label: '高亮最新事件',
          default: true
        },
        eventStatus: {
          type: 'select',
          label: '事件状态',
          options: [
            { value: 'published', label: '仅已发布' },
            { value: 'all', label: '全部状态' }
          ],
          default: 'published'
        },
        industryTypeId: {
          type: 'text',
          label: '行业类型ID',
          placeholder: '按行业类型过滤'
        },
        eventTypeId: {
          type: 'text',
          label: '事件类型ID',
          placeholder: '按事件类型过滤'
        },
        province: {
          type: 'text',
          label: '省份筛选',
          placeholder: '示例：北京市'
        },
        apiKeyOverride: {
          type: 'text',
          label: '高德地图Key',
          placeholder: '可选：覆盖默认地图Key'
        }
      },
      defaultConfig: {
        mode: 'edit',
        title: '事件地图分布',
        mapTheme: 'midnight',
        maxEvents: 200,
        refreshInterval: 60000,
        autoFit: true,
        enableCluster: true,
        showLegend: true,
        showSummary: true,
        highlightLatest: true,
        eventStatus: 'published'
      }
    };

    this.componentRegistry.register(eventMapMetadata, EventMapDistributionComponent);

    // 注册热门事件排行榜组件
    const hotEventsRankingMetadata: ComponentMetadata = {
      type: 'hot-events-ranking',
      name: '热门事件排行榜',
      category: '事件分析',
      icon: '🏆',
      description: '展示热门事件的排行榜，支持热度趋势、地域信息和自动刷新',
      configSchema: {
        mode: {
          type: 'select',
          label: '显示模式',
          options: [
            { value: 'edit', label: '编辑模式' },
            { value: 'display', label: '展示模式' }
          ],
          default: 'display'
        },
        title: {
          type: 'text',
          label: '标题',
          default: '热门事件排行榜',
          placeholder: '如：今日热点事件排行'
        },
        maxItems: {
          type: 'number',
          label: '最大显示数量',
          min: 3,
          max: 20,
          default: 8
        },
        refreshInterval: {
          type: 'number',
          label: '刷新间隔(毫秒)',
          min: 0,
          step: 1000,
          default: 60000
        },
        highlightTopN: {
          type: 'number',
          label: '高亮前N名',
          min: 1,
          max: 10,
          default: 3
        },
        showSummary: {
          type: 'boolean',
          label: '显示事件摘要',
          default: true
        },
        showTrend: {
          type: 'boolean',
          label: '显示热度趋势',
          default: true
        },
        showLocation: {
          type: 'boolean',
          label: '显示地域信息',
          default: true
        },
        allowManualRefresh: {
          type: 'boolean',
          label: '允许手动刷新',
          default: true
        },
        eventStatus: {
          type: 'select',
          label: '事件状态',
          options: [
            { value: 'all', label: '全部事件' },
            { value: 'published', label: '仅已发布' }
          ],
          default: 'published'
        },
        industryTypeId: {
          type: 'text',
          label: '行业类型ID',
          placeholder: '按行业类型过滤'
        },
        eventTypeId: {
          type: 'text',
          label: '事件类型ID',
          placeholder: '按事件类型过滤'
        },
        province: {
          type: 'text',
          label: '省份筛选',
          placeholder: '示例：北京市'
        },
        staticEntries: {
          type: 'array',
          label: '静态事件列表',
          placeholder: 'JSON格式的静态事件数据'
        }
      },
      defaultConfig: {
        mode: 'display',
        title: '热门事件排行榜',
        maxItems: 6,
        refreshInterval: 0,
        highlightTopN: 3,
        showSummary: false,
        showTrend: true,
        showLocation: true,
        allowManualRefresh: false,
        eventStatus: 'published'
      }
    };

    this.componentRegistry.register(hotEventsRankingMetadata, HotEventsRankingComponent);
  }

  /**
   * 注册图表组件
   */
  private registerChartComponents(): void {
    const wordCloudMetadata: ComponentMetadata = {
      type: 'word-cloud-statistics',
      name: '关键词词云',
      category: '可视化图表',
      icon: '☁️',
      description: '以可视化云图呈现高频关键词，支持动态刷新、色彩映射与焦点词高亮展示',
      configSchema: {
        mode: {
          type: 'select',
          label: '显示模式',
          options: [
            { value: 'edit', label: '编辑模式' },
            { value: 'display', label: '展示模式' }
          ],
          default: 'display'
        },
        title: {
          type: 'text',
          label: '标题',
          default: '关键词词云'
        },
        maxWords: {
          type: 'number',
          label: '最大词条数量',
          min: 10,
          max: 200,
          default: 60
        },
        minFontSize: {
          type: 'number',
          label: '最小字号',
          min: 8,
          max: 60,
          default: 18
        },
        maxFontSize: {
          type: 'number',
          label: '最大字号',
          min: 24,
          max: 120,
          default: 54
        },
        palette: {
          type: 'color-list',
          label: '色板',
          default: ['#2563eb', '#7c3aed', '#ea580c', '#059669', '#f59e0b', '#0ea5e9']
        },
        background: {
          type: 'select',
          label: '背景主题',
          options: [
            { value: 'transparent', label: '通透玻璃' },
            { value: 'light', label: '明亮极简' },
            { value: 'dark', label: '深色夜景' }
          ],
          default: 'transparent'
        },
        rotate: {
          type: 'boolean',
          label: '启用旋转',
          default: true
        },
        refreshInterval: {
          type: 'number',
          label: '自动刷新间隔(毫秒)',
          min: 0,
          step: 1000,
          default: 45000
        },
        highlightThreshold: {
          type: 'number',
          label: '焦点词阈值',
          min: 0,
          default: 72
        },
        showMetaPanel: {
          type: 'boolean',
          label: '显示元信息面板',
          default: true
        },
        randomizeOnRefresh: {
          type: 'boolean',
          label: '刷新时重新排布',
          default: true
        }
      },
      defaultConfig: {
        mode: 'display',
        title: '关键词词云',
        maxWords: 60,
        minFontSize: 18,
        maxFontSize: 54,
        palette: ['#2563eb', '#7c3aed', '#ea580c', '#059669', '#f59e0b', '#0ea5e9'],
        background: 'transparent',
        rotate: true,
        rotationAngles: [-25, -12, 0, 12, 25],
        refreshInterval: 45000,
        highlightThreshold: 72,
        showMetaPanel: true,
        randomizeOnRefresh: true
      }
    };

    this.componentRegistry.register(wordCloudMetadata, WordCloudStatisticsComponent);
  }

  /**
   * 获取所有已注册组件的统计信息
   */
  getRegistrationStats(): {
    totalComponents: number;
    componentsByCategory: { [category: string]: number };
    components: Array<{
      type: string;
      name: string;
      category: string;
    }>;
  } {
    const allComponents = this.componentRegistry.getAll();
    const componentsByCategory: { [category: string]: number } = {};

    allComponents.forEach(comp => {
      const category = comp.metadata.category || '未分类';
      componentsByCategory[category] = (componentsByCategory[category] || 0) + 1;
    });

    return {
      totalComponents: allComponents.length,
      componentsByCategory,
      components: allComponents.map(comp => ({
        type: comp.type,
        name: comp.metadata.name,
        category: comp.metadata.category || '未分类'
      }))
    };
  }

  /**
   * 验证组件注册是否成功
   */
  validateRegistration(): {
    isValid: boolean;
    registeredComponents: string[];
    missingComponents: string[];
    errors: string[];
  } {
    const expectedComponents = [
      'weibo-logged-in-users-card',
      'event-map-distribution',
      'hot-events-ranking',
      'word-cloud-statistics'
    ];

    const registeredComponents: string[] = [];
    const missingComponents: string[] = [];
    const errors: string[] = [];

    expectedComponents.forEach(componentType => {
      const component = this.componentRegistry.get(componentType);
      if (component) {
        registeredComponents.push(componentType);
      } else {
        missingComponents.push(componentType);
        errors.push(`组件 ${componentType} 未正确注册`);
      }
    });

    return {
      isValid: missingComponents.length === 0,
      registeredComponents,
      missingComponents,
      errors
    };
  }
}
