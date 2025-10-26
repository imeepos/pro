import { Provider } from './provider';

/**
 * 环境注入器工具函数
 * 提取一些通用的工具方法以减少主文件的代码行数
 */
export class EnvironmentInjectorUtils {
  /**
   * 获取令牌的可读名称，用于错误消息
   */
  static getTokenName(token: any): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.toString();
    }
    if (typeof token === 'function') {
      return token.name || 'anonymous';
    }
    if (token && typeof token === 'object' && token.toString) {
      return token.toString();
    }
    return String(token);
  }

  /**
   * 获取令牌类型
   */
  static getTokenType(token: any): string {
    if (typeof token === 'string') {
      return 'string';
    }
    if (typeof token === 'symbol') {
      return 'symbol';
    }
    if (typeof token === 'function') {
      return 'class';
    }
    if (token && typeof token === 'object' && token.toString) {
      return 'InjectionToken';
    }
    return 'unknown';
  }

  /**
   * 获取提供者类型
   */
  static getProviderType(provider: Provider): string {
    if ('useValue' in provider) {
      return 'ValueProvider';
    }
    if ('useClass' in provider) {
      return 'ClassProvider';
    }
    if ('useFactory' in provider) {
      return 'FactoryProvider';
    }
    if ('useExisting' in provider) {
      return 'ExistingProvider';
    }
    if ('useLazyClass' in provider) {
      return 'LazyClassProvider';
    }
    if ('useLazyFactory' in provider) {
      return 'LazyFactoryProvider';
    }
    return 'ConstructorProvider';
  }

  /**
   * 检查是否为多值提供者
   */
  static isMultiProvider(providers: Provider[]): boolean {
    return providers.some((p) => p.multi);
  }

  /**
   * 验证注入选项的互斥性
   */
  static validateInjectOptions(options: any): void {
    if (options.self && options.skipSelf) {
      throw new Error('InjectOptions: self 和 skipSelf 选项不能同时使用');
    }
    if (options.host && (options.self || options.skipSelf)) {
      throw new Error(
        'InjectOptions: host 选项不能与 self 或 skipSelf 同时使用',
      );
    }
  }

  /**
   * 生成循环依赖错误消息
   */
  static generateCircularDependencyError(
    currentToken: any,
    dependencyPath: any[],
    getTokenName: (
      token: any,
    ) => string = EnvironmentInjectorUtils.getTokenName,
  ): Error {
    const tokenName = getTokenName(currentToken);
    const pathStr = dependencyPath.map((t) => getTokenName(t)).join(' -> ');
    return new Error(`检测到循环依赖: ${pathStr} -> ${tokenName}`);
  }

  /**
   * 生成唯一的注入器ID
   */
  static generateInjectorId(): string {
    return `injector_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
