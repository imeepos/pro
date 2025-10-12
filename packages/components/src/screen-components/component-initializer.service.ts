import { Injectable } from '@angular/core';
import { ComponentRegistryService } from './base/component-registry.service';
import { ComponentMetadata } from './base/component-metadata.interface';
import { WeiboLoggedInUsersCardComponent } from './weibo/weibo-logged-in-users-card.component';

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
      'weibo-logged-in-users-card'
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