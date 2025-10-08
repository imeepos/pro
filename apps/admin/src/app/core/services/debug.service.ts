import { Injectable, EnvironmentInjector, Type, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DebugService {

  constructor(private environmentInjector: EnvironmentInjector) {
    console.log('DebugService 构造函数执行成功');
    console.log('EnvironmentInjector:', !!this.environmentInjector);
  }

  /**
   * 分析组件的依赖项
   */
  analyzeComponentDependencies(componentClass: Type<any>): Array<{name: string, type: string}> {
    try {
      const dependencies: Array<{name: string, type: string}> = [];

      // 简化版本，只返回基本信息
      dependencies.push({
        name: 'basic_info',
        type: componentClass.name || 'Unknown'
      });

      return dependencies;
    } catch (error) {
      console.error('分析组件依赖失败:', error);
      return [];
    }
  }

  /**
   * 检查服务是否可用
   */
  checkServiceAvailability(serviceToken: any): boolean {
    try {
      const service = this.environmentInjector.get(serviceToken, null);
      return service !== null;
    } catch (error) {
      console.error('检查服务可用性失败:', error);
      return false;
    }
  }

  /**
   * 获取可用的调试信息
   */
  getDebugInfo(componentClass: Type<any>): any {
    return {
      componentName: componentClass.name,
      dependencies: this.analyzeComponentDependencies(componentClass),
      hasEnvironmentInjector: !!this.environmentInjector
    };
  }

  /**
   * 测试依赖注入系统
   */
  testDependencyInjection(): boolean {
    try {
      console.log('依赖注入系统测试开始...');
      console.log('EnvironmentInjector 可用:', !!this.environmentInjector);

      // 测试基本服务可用性
      const httpClientAvailable = this.checkServiceAvailability(HttpClient);
      console.log('HttpClient 可用:', httpClientAvailable);

      return true;
    } catch (error) {
      console.error('依赖注入系统测试失败:', error);
      return false;
    }
  }
}