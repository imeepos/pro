/**
 * 组件注册表实现
 * 提供统一的组件管理和类型安全的组件查找
 */

import React from 'react';
import { ComponentRegistry, RegisteredComponent, ComponentConfig } from '../types/layout';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ComponentRegistry');

/**
 * 组件注册表实现类
 */
class ComponentRegistryImpl implements ComponentRegistry {
  private components = new Map<string, RegisteredComponent>();

  /**
   * 注册组件
   */
  register<T extends Record<string, unknown>>(
    name: string,
    component: React.ComponentType<T>,
    config: ComponentConfig
  ): void {
    if (this.components.has(name)) {
      logger.warn(`Component ${name} is already registered. Overwriting...`);
    }

    // 验证配置
    if (!this.validateConfig(config)) {
      throw new Error(`Invalid config for component ${name}`);
    }

    this.components.set(name, {
      name,
      component,
      config
    });

    logger.debug(`Component ${name} registered successfully`);
  }

  /**
   * 获取组件
   */
  get(name: string): RegisteredComponent | undefined {
    return this.components.get(name);
  }

  /**
   * 获取所有组件
   */
  list(): RegisteredComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * 按类别获取组件
   */
  getByCategory(category: string): RegisteredComponent[] {
    return this.list().filter(comp => comp.config.category === category);
  }

  /**
   * 取消注册组件
   */
  unregister(name: string): void {
    if (this.components.has(name)) {
      this.components.delete(name);
      logger.debug(`Component ${name} unregistered successfully`);
    } else {
      logger.warn(`Component ${name} is not registered`);
    }
  }

  /**
   * 检查组件是否已注册
   */
  has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * 获取所有类别
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const comp of this.components.values()) {
      categories.add(comp.config.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * 清空所有注册的组件
   */
  clear(): void {
    this.components.clear();
    logger.debug('All components cleared from registry');
  }

  /**
   * 获取注册的组件数量
   */
  size(): number {
    return this.components.size;
  }

  /**
   * 验证组件配置
   */
  private validateConfig(config: ComponentConfig): boolean {
    const required = ['displayName', 'category', 'defaultSize'];
    for (const field of required) {
      if (!(field in config)) {
        logger.error(`Component config missing required field: ${field}`);
        return false;
      }
    }

    if (!config.defaultSize.w || !config.defaultSize.h) {
      logger.error('Component config defaultSize must have positive w and h values');
      return false;
    }

    return true;
  }
}

// 全局组件注册表实例
export const componentRegistry = new ComponentRegistryImpl();

// 导出类型以供其他地方使用
export type { ComponentRegistry, RegisteredComponent, ComponentConfig };

/**
 * React Hook: 使用组件注册表
 */
export function useComponentRegistry() {
  return {
    register: componentRegistry.register.bind(componentRegistry),
    get: componentRegistry.get.bind(componentRegistry),
    list: componentRegistry.list.bind(componentRegistry),
    getByCategory: componentRegistry.getByCategory.bind(componentRegistry),
    unregister: componentRegistry.unregister.bind(componentRegistry),
    has: componentRegistry.has.bind(componentRegistry),
    getCategories: componentRegistry.getCategories.bind(componentRegistry)
  };
}

/**
 * 组件注册装饰器（用于自动注册组件）
 */
export function registerComponent(name: string, config: ComponentConfig) {
  return function<T extends React.ComponentType<any>>(component: T): T {
    componentRegistry.register(name, component, config);
    return component;
  };
}

/**
 * 批量注册组件的工具函数
 */
export function registerComponents(components: Array<{
  name: string;
  component: React.ComponentType<any>;
  config: ComponentConfig;
}>) {
  components.forEach(({ name, component, config }) => {
    componentRegistry.register(name, component, config);
  });
}

/**
 * 从组件注册表获取组件的 React Hook
 */
export function useComponent(name: string): RegisteredComponent | undefined {
  return componentRegistry.get(name);
}

/**
 * 安全获取组件的工具函数
 */
export function getComponentSafely(name: string): React.ComponentType<any> | null {
  const registered = componentRegistry.get(name);
  return registered ? registered.component : null;
}