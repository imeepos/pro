import { Injectable, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { EventBusService } from './event-bus.service';
import { EventExecutorService } from './event-executor.service';
import { CanvasQuery } from '../canvas/services/canvas.query';
import { ComponentItem } from '../models/component.model';
import { EventType, Event, ComponentEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class ComponentEventHandlerService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isPreviewMode = false;

  constructor(
    private eventBus: EventBusService,
    private eventExecutor: EventExecutorService,
    private canvasQuery: CanvasQuery
  ) {
    this.initModeMonitoring();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initModeMonitoring(): void {
    this.canvasQuery.editMode$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(mode => {
      this.isPreviewMode = mode === 'preview';
    });

    this.canvasQuery.componentData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((components: ComponentItem[]) => {
      this.eventExecutor.registerComponents(components);
    });
  }

  handleComponentClick(component: ComponentItem, nativeEvent: MouseEvent): void {
    if (!this.isPreviewMode) return;

    this.triggerComponentEvent(component, EventType.COMPONENT_CLICK, nativeEvent);
  }

  handleComponentHover(component: ComponentItem, nativeEvent: MouseEvent): void {
    if (!this.isPreviewMode) return;

    this.triggerComponentEvent(component, EventType.COMPONENT_HOVER, nativeEvent);
  }

  handleComponentLeave(component: ComponentItem, nativeEvent: MouseEvent): void {
    if (!this.isPreviewMode) return;

    this.triggerComponentEvent(component, EventType.COMPONENT_LEAVE, nativeEvent);
  }

  handleComponentDataChange(component: ComponentItem, newData: any): void {
    if (!this.isPreviewMode) return;

    this.triggerComponentEvent(component, EventType.DATA_CHANGE, { newData });
  }

  private triggerComponentEvent(
    component: ComponentItem,
    eventType: EventType,
    nativeEvent?: MouseEvent | any
  ): void {
    if (!component.events || component.events.length === 0) {
      return;
    }

    const matchingEvents = component.events.filter(
      event => event.type === eventType && event.enabled !== false
    );

    matchingEvents.forEach(componentEvent => {
      this.executeComponentEvent(component, componentEvent, nativeEvent);
    });
  }

  private async executeComponentEvent(
    component: ComponentItem,
    componentEvent: ComponentEvent,
    nativeEvent?: any
  ): Promise<void> {
    const event: Event = {
      id: `${componentEvent.id}_${Date.now()}`,
      type: componentEvent.type,
      sourceComponentId: component.id,
      actionType: componentEvent.actions[0]?.type,
      params: {
        nativeEvent,
        componentData: component.config
      },
      timestamp: Date.now()
    };

    this.eventBus.emit(event);

    try {
      await this.eventExecutor.executeActions(event, componentEvent.actions);
    } catch (error) {
      console.error(`事件执行失败: ${componentEvent.id}`, error);
    }
  }

  getIsPreviewMode(): boolean {
    return this.isPreviewMode;
  }
}
