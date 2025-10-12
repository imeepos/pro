import { Injectable } from '@angular/core';
import { ComponentRegistryService } from '../screen-components/base/component-registry.service';
import { IScreenComponent } from '../screen-components/base/screen-component.interface';

export interface ComponentValidationResult {
  component: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConsistencyValidationReport {
  totalComponents: number;
  validComponents: number;
  invalidComponents: number;
  results: ComponentValidationResult[];
  summary: {
    hasErrors: boolean;
    hasWarnings: boolean;
    isFullyConsistent: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ComponentConsistencyService {

  constructor(private componentRegistry: ComponentRegistryService) {}

  /**
   * 验证所有注册组件的一致性
   */
  validateAllComponents(): ConsistencyValidationReport {
    const allComponents = this.componentRegistry.getAll();
    const results: ComponentValidationResult[] = [];

    for (const registered of allComponents) {
      const result = this.validateComponent(registered.type, registered.component);
      results.push(result);
    }

    return this.generateReport(results);
  }

  /**
   * 验证单个组件的一致性
   */
  validateComponent(type: string, componentClass: any): ComponentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 检查组件是否实现了 IScreenComponent 接口
    if (!this.implementsIScreenComponent(componentClass)) {
      errors.push('组件未实现 IScreenComponent 接口');
    }

    // 2. 检查组件是否有必需的方法
    const instance = this.createComponentInstance(componentClass);
    if (instance) {
      if (!this.hasMethod(instance, 'onConfigChange')) {
        errors.push('缺少 onConfigChange 方法');
      }

      if (!this.hasMethod(instance, 'ngOnInit')) {
        warnings.push('建议实现 ngOnInit 生命周期方法');
      }

      if (!this.hasMethod(instance, 'ngOnDestroy')) {
        warnings.push('建议实现 ngOnDestroy 生命周期方法');
      }
    }

    // 3. 检查组件元数据
    const metadata = this.componentRegistry.getMetadata(type);
    if (!metadata) {
      errors.push('组件缺少元数据配置');
    } else {
      if (!metadata.name || metadata.name.trim() === '') {
        errors.push('组件元数据缺少名称');
      }

      if (!metadata.category || metadata.category.trim() === '') {
        warnings.push('组件元数据缺少分类');
      }

      if (!metadata.icon || metadata.icon.trim() === '') {
        warnings.push('组件元数据缺少图标');
      }
    }

    // 4. 检查组件是否为 standalone 组件
    if (!this.isStandaloneComponent(componentClass)) {
      warnings.push('建议使用 standalone 组件');
    }

    // 5. 检查组件是否有合适的选择器
    if (!this.hasValidSelector(componentClass)) {
      warnings.push('组件选择器可能不符合命名规范');
    }

    return {
      component: type,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 检查在 admin 和 web 端的组件一致性
   */
  validateCrossApplicationConsistency(): {
    adminComponents: string[];
    webComponents: string[];
    common: string[];
    adminOnly: string[];
    webOnly: string[];
  } {
    const allComponents = this.componentRegistry.getAll().map(c => c.type);

    // 在实际应用中，这里应该从两个应用的注册表中获取组件列表
    // 为了演示，我们假设当前注册的组件应该在两端都可用
    return {
      adminComponents: allComponents,
      webComponents: allComponents,
      common: allComponents,
      adminOnly: [],
      webOnly: []
    };
  }

  /**
   * 生成组件一致性报告
   */
  private generateReport(results: ComponentValidationResult[]): ConsistencyValidationReport {
    const totalComponents = results.length;
    const validComponents = results.filter(r => r.isValid).length;
    const invalidComponents = totalComponents - validComponents;

    const hasErrors = results.some(r => r.errors.length > 0);
    const hasWarnings = results.some(r => r.warnings.length > 0);
    const isFullyConsistent = !hasErrors && !hasWarnings;

    return {
      totalComponents,
      validComponents,
      invalidComponents,
      results,
      summary: {
        hasErrors,
        hasWarnings,
        isFullyConsistent
      }
    };
  }

  private implementsIScreenComponent(componentClass: any): boolean {
    // 简单检查是否有 onConfigChange 方法
    const instance = this.createComponentInstance(componentClass);
    return instance && typeof instance.onConfigChange === 'function';
  }

  private createComponentInstance(componentClass: any): any {
    try {
      // 这是一个简化的实例创建，在实际环境中可能需要依赖注入
      return new componentClass();
    } catch (error) {
      console.warn('无法创建组件实例:', error);
      return null;
    }
  }

  private hasMethod(instance: any, methodName: string): boolean {
    return instance && typeof instance[methodName] === 'function';
  }

  private isStandaloneComponent(componentClass: any): boolean {
    // 检查组件装饰器中是否有 standalone: true
    return componentClass?.ɵcmp?.standalone === true;
  }

  private hasValidSelector(componentClass: any): boolean {
    const selector = componentClass?.ɵcmp?.selectors?.[0]?.[0];
    if (!selector) return false;

    // 检查是否遵循命名约定 (例如: pro-component-name)
    return typeof selector === 'string' && selector.startsWith('pro-');
  }

  /**
   * 获取组件性能统计
   */
  getComponentPerformanceStats(): {
    loadTimes: { [componentType: string]: number };
    renderTimes: { [componentType: string]: number };
    memoryUsage: { [componentType: string]: number };
  } {
    // 这是一个模拟实现，实际应用中需要真实的性能监控
    const allComponents = this.componentRegistry.getAll();
    const stats = {
      loadTimes: {} as { [key: string]: number },
      renderTimes: {} as { [key: string]: number },
      memoryUsage: {} as { [key: string]: number }
    };

    allComponents.forEach(comp => {
      stats.loadTimes[comp.type] = Math.random() * 100 + 10; // 模拟加载时间
      stats.renderTimes[comp.type] = Math.random() * 50 + 5; // 模拟渲染时间
      stats.memoryUsage[comp.type] = Math.random() * 1024 + 100; // 模拟内存使用
    });

    return stats;
  }

  /**
   * 检查组件配置兼容性
   */
  validateConfigCompatibility(componentType: string, config: any): {
    isCompatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!config) {
      issues.push('配置对象为空');
      return { isCompatible: false, issues, suggestions };
    }

    // 基本配置验证
    if (config.mode && !['edit', 'display'].includes(config.mode)) {
      issues.push('mode 配置项只能是 "edit" 或 "display"');
    }

    if (config.refreshInterval && (typeof config.refreshInterval !== 'number' || config.refreshInterval < 0)) {
      issues.push('refreshInterval 必须是非负数');
    }

    if (config.theme && typeof config.theme !== 'string') {
      issues.push('theme 必须是字符串类型');
    }

    // 提供优化建议
    if (config.refreshInterval && config.refreshInterval < 1000) {
      suggestions.push('刷新间隔建议不少于1000ms，避免过于频繁的更新');
    }

    if (!config.hasOwnProperty('enableAnimation')) {
      suggestions.push('建议显式设置 enableAnimation 属性');
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      suggestions
    };
  }
}