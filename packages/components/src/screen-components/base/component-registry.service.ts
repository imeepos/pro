import { Injectable, Type } from '@angular/core';
import { ComponentMetadata } from './component-metadata.interface';

interface RegisteredComponent {
  component: Type<any>;
  metadata: ComponentMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentRegistryService {
  private components = new Map<string, RegisteredComponent>();

  register(metadata: ComponentMetadata, component: Type<any>): void {
    this.components.set(metadata.type, { component, metadata });
  }

  get(type: string): Type<any> | undefined {
    return this.components.get(type)?.component;
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
}