import { Injectable, Type } from '@angular/core';
import { ComponentMetadata } from './component-metadata.interface';

interface RegisteredComponent {
  component: Type<any>;
  metadata: ComponentMetadata;
}

interface ComponentValidationResult {
  isValid: boolean;
  component?: Type<any>;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentRegistryService {
  private components = new Map<string, RegisteredComponent>();
  private readonly logPrefix = '[ComponentRegistry]';

  register(metadata: ComponentMetadata, component: Type<any>): void {
    const validationResult = this.validateComponent(component, metadata.type);

    if (!validationResult.isValid) {
      this.logError(`Registration failed for component '${metadata.type}': ${validationResult.error}`);
      throw new Error(`Component registration failed: ${validationResult.error}`);
    }

    this.components.set(metadata.type, { component, metadata });
    this.logInfo(`Component '${metadata.type}' registered successfully`);
  }

  get(type: string): Type<any> | undefined {
    const registered = this.components.get(type);
    if (!registered) {
      this.logWarn(`Component '${type}' not found in registry`);
      return undefined;
    }

    const validationResult = this.validateComponent(registered.component, type);
    if (!validationResult.isValid) {
      this.logError(`Component '${type}' failed validation: ${validationResult.error}`);
      return undefined;
    }

    return registered.component;
  }

  getMetadata(type: string): ComponentMetadata | undefined {
    return this.components.get(type)?.metadata;
  }

  getAll(): Array<{ type: string; component: Type<any>; metadata: ComponentMetadata }> {
    return Array.from(this.components.entries()).map(([type, registered]) => ({
      type,
      component: registered.component,
      metadata: registered.metadata
    }));
  }

  getAllByCategory(category: string): Array<{ type: string; component: Type<any>; metadata: ComponentMetadata }> {
    return this.getAll().filter(item => item.metadata.category === category);
  }

  getWithValidation(type: string): ComponentValidationResult {
    const registered = this.components.get(type);
    if (!registered) {
      return {
        isValid: false,
        error: `Component '${type}' not found in registry`
      };
    }

    return this.validateComponent(registered.component, type);
  }

  private validateComponent(component: Type<any>, type: string): ComponentValidationResult {
    if (!component) {
      return {
        isValid: false,
        error: 'Component class is null or undefined'
      };
    }

    if (typeof component !== 'function') {
      return {
        isValid: false,
        error: 'Component is not a constructor function'
      };
    }

    // 检查Angular组件元数据 (ɵcmp)
    const componentDef = (component as any).ɵcmp;
    if (!componentDef) {
      return {
        isValid: false,
        error: 'Component lacks Angular metadata (ɵcmp). Ensure it is decorated with @Component'
      };
    }

    // 验证组件定义的基本结构
    if (!componentDef.type || componentDef.type !== component) {
      return {
        isValid: false,
        error: 'Component metadata is corrupted or mismatched'
      };
    }

    return {
      isValid: true,
      component
    };
  }

  private logInfo(message: string): void {
    console.log(`${this.logPrefix} ${message}`);
  }

  private logWarn(message: string): void {
    console.warn(`${this.logPrefix} ${message}`);
  }

  private logError(message: string): void {
    console.error(`${this.logPrefix} ${message}`);
  }
}