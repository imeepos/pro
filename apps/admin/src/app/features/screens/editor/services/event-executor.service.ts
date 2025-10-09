import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { EventAction, EventActionType, Event } from '../models/event.model';
import { ComponentItem } from '../models/component.model';
import { EventBusService } from './event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class EventExecutorService {
  private components = new Map<string, ComponentItem>();

  constructor(
    private eventBus: EventBusService,
    private router: Router
  ) {}

  registerComponents(components: ComponentItem[]): void {
    this.components.clear();
    this.flattenComponents(components);
  }

  private flattenComponents(components: ComponentItem[]): void {
    components.forEach(comp => {
      this.components.set(comp.id, comp);
      if (comp.children && comp.children.length > 0) {
        this.flattenComponents(comp.children);
      }
    });
  }

  async executeActions(event: Event, actions: EventAction[]): Promise<void> {
    for (const action of actions) {
      try {
        if (action.condition && !this.evaluateCondition(action.condition, event)) {
          continue;
        }

        await this.executeAction(event, action);
        this.eventBus.recordHistory(event, true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        console.error(`执行事件动作失败: ${errorMsg}`, { event, action, error });
        this.eventBus.recordHistory(event, false, errorMsg);
      }
    }
  }

  private async executeAction(event: Event, action: EventAction): Promise<void> {
    switch (action.type) {
      case EventActionType.SHOW:
        this.toggleComponentVisibility(action.targetComponentId, true);
        break;

      case EventActionType.HIDE:
        this.toggleComponentVisibility(action.targetComponentId, false);
        break;

      case EventActionType.TOGGLE_VISIBILITY:
        this.toggleComponentVisibility(action.targetComponentId);
        break;

      case EventActionType.UPDATE_DATA:
        this.updateComponentData(action.targetComponentId, action.params);
        break;

      case EventActionType.NAVIGATE:
        this.navigate(action.params?.url || '', action.params?.target);
        break;

      case EventActionType.CUSTOM_SCRIPT:
        if (action.script) {
          this.executeCustomScript(action.script, event, action);
        }
        break;

      default:
        console.warn(`未知的事件动作类型: ${action.type}`);
    }
  }

  private toggleComponentVisibility(componentId?: string, show?: boolean): void {
    if (!componentId) {
      console.warn('目标组件ID为空');
      return;
    }

    const component = this.components.get(componentId);
    if (!component) {
      console.warn(`未找到组件: ${componentId}`);
      return;
    }

    component.display = show !== undefined ? show : !component.display;
  }

  private updateComponentData(componentId?: string, data?: Record<string, any>): void {
    if (!componentId) {
      console.warn('目标组件ID为空');
      return;
    }

    const component = this.components.get(componentId);
    if (!component) {
      console.warn(`未找到组件: ${componentId}`);
      return;
    }

    if (data) {
      component.config = { ...component.config, ...data };
    }
  }

  private navigate(url: string, target?: string): void {
    if (!url) {
      console.warn('导航URL为空');
      return;
    }

    if (target === '_blank') {
      window.open(url, '_blank');
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      window.location.href = url;
    } else {
      this.router.navigate([url]);
    }
  }

  private executeCustomScript(script: string, event: Event, action: EventAction): void {
    try {
      const fn = new Function('event', 'action', 'components', script);
      fn(event, action, this.components);
    } catch (error) {
      console.error('自定义脚本执行失败:', error);
      throw error;
    }
  }

  private evaluateCondition(condition: string, event: Event): boolean {
    try {
      const fn = new Function('event', `return ${condition}`);
      return fn(event);
    } catch (error) {
      console.error('条件表达式求值失败:', error);
      return false;
    }
  }

  getComponent(componentId: string): ComponentItem | undefined {
    return this.components.get(componentId);
  }

  getAllComponents(): Map<string, ComponentItem> {
    return new Map(this.components);
  }
}
