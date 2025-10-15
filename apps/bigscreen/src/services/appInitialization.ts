/**
 * 应用初始化服务
 * 负责设置组件注册表、类型检查和系统配置
 */

import { initializeDefaultComponents } from './defaultComponents';
import { componentRegistry } from './ComponentRegistry';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AppInitialization');

/**
 * 初始化应用
 */
export async function initializeApp() {
  logger.info('Initializing Weibo Sentiment Dashboard...');

  try {
    // 1. 初始化组件注册表
    logger.info('Registering default components...');
    initializeDefaultComponents();
    
    // 2. 验证组件注册
    const registeredCount = componentRegistry.size();
    logger.info(`Successfully registered ${registeredCount} components`);
    
    // 3. 打印注册的组件信息（开发模式）
    if (process.env.NODE_ENV === 'development') {
      const categories = componentRegistry.getCategories();
      logger.debug('Component categories:', categories);
      
      categories.forEach(category => {
        const components = componentRegistry.getByCategory(category);
        logger.debug(`${category}: ${components.map(c => c.name).join(', ')}`);
      });
    }
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    throw error;
  }
}

/**
 * 运行应用健康检查
 */
export function runHealthCheck() {
  const issues: string[] = [];
  
  // 检查组件注册表
  const registeredCount = componentRegistry.size();
  if (registeredCount === 0) {
    issues.push('No components registered');
  }
  
  // 检查必要组件
  const requiredComponents = ['StatsOverview', 'EmptyWidget'];
  for (const componentName of requiredComponents) {
    if (!componentRegistry.has(componentName)) {
      issues.push(`Required component missing: ${componentName}`);
    }
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    registeredComponents: registeredCount
  };
}

/**
 * 获取应用统计信息
 */
export function getAppStats() {
  return {
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    registeredComponents: componentRegistry.size(),
    componentCategories: componentRegistry.getCategories().length,
    buildTime: process.env.REACT_APP_BUILD_TIME || new Date().toISOString()
  };
}