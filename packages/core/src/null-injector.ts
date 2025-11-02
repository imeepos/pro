import { Injector, InjectionTokenType, Type } from './injector';
import { Provider } from './provider';

/**
 * 空注入器，作为注入器链的终点
 * 对于任何请求都会抛出"未找到提供者"的错误
 */
export class NullInjector extends Injector {
  constructor() {
    super();
  }

  /**
   * 获取依赖实例，但总是抛出错误
   * @param token 注入令牌
   * @throws Error 总是抛出未找到提供者的错误
   */
  get<T>(token: InjectionTokenType<T>, def?: T): T {
    if (def) return def;
    const tokenName =
      typeof token === 'function' ? token.name : token.toString();
    debugger;
    console.log(`NullInjector: No Provider for `, { token, def })
    throw new Error(`NullInjector: No provider for ${tokenName}`);
  }

  set(_providers: Provider[]): void {
    throw new Error(`NullInjector: No set method`)
  }

  async init(): Promise<void> {
    // NullInjector 无需初始化
  }

  async destroy(): Promise<void> {
    // NullInjector 无需销毁
  }

  use(_providers: (Provider | Type<any>)[]): void {}
}
