import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { ComponentEvent, EventType, EventAction, EventActionType } from '../../models/event.model';
import { CanvasQuery } from '../../canvas/services/canvas.query';
import { CanvasService } from '../../canvas/services/canvas.service';

@Component({
  selector: 'app-event-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="event-config-panel h-full p-4 space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">事件配置</h3>
        <button
          (click)="addEvent()"
          class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          + 添加事件
        </button>
      </div>

      <div *ngIf="events.length === 0" class="text-center py-8">
        <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p class="text-sm text-gray-500 dark:text-gray-400">暂无事件配置</p>
      </div>

      <div *ngFor="let event of events; let i = index" class="event-card border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
        <!-- 事件头部 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              (click)="toggleEventExpanded(i)"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg class="w-4 h-4 transition-transform" [ngClass]="{ 'rotate-90': expandedEvents.has(i) }" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ getEventTypeLabel(event.type) }}</span>
            <span *ngIf="!event.enabled" class="text-xs text-gray-400">(已禁用)</span>
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="event.enabled"
                (change)="updateComponent()"
                class="w-3 h-3 text-blue-600 rounded"
              />
              <span class="text-xs text-gray-500 dark:text-gray-400">启用</span>
            </label>
            <button
              (click)="removeEvent(i)"
              class="text-red-500 hover:text-red-700"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 事件详情 -->
        <div *ngIf="expandedEvents.has(i)" class="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
          <!-- 触发器 -->
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">触发条件</label>
            <select
              [(ngModel)]="event.type"
              (change)="updateComponent()"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option [value]="EventType.COMPONENT_CLICK">组件点击</option>
              <option [value]="EventType.COMPONENT_HOVER">组件悬停</option>
              <option [value]="EventType.COMPONENT_LEAVE">组件离开</option>
              <option [value]="EventType.DATA_CHANGE">数据变化</option>
              <option [value]="EventType.CUSTOM">自定义</option>
            </select>
          </div>

          <!-- 描述 -->
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">描述</label>
            <input
              type="text"
              [(ngModel)]="event.description"
              (change)="updateComponent()"
              placeholder="事件描述（可选）"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <!-- 动作列表 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs text-gray-600 dark:text-gray-400">动作</label>
              <button
                (click)="addAction(event)"
                class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                + 添加动作
              </button>
            </div>

            <div *ngFor="let action of event.actions; let j = index" class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
              <div class="flex items-center justify-between">
                <select
                  [(ngModel)]="action.type"
                  (change)="updateComponent()"
                  class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option [value]="EventActionType.SHOW">显示组件</option>
                  <option [value]="EventActionType.HIDE">隐藏组件</option>
                  <option [value]="EventActionType.TOGGLE_VISIBILITY">切换可见性</option>
                  <option [value]="EventActionType.UPDATE_DATA">更新数据</option>
                  <option [value]="EventActionType.NAVIGATE">页面跳转</option>
                  <option [value]="EventActionType.CUSTOM_SCRIPT">自定义脚本</option>
                </select>
                <button
                  (click)="removeAction(event, j)"
                  class="ml-2 text-red-500 hover:text-red-700"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>

              <!-- 目标组件 -->
              <div *ngIf="needsTargetComponent(action.type)">
                <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">目标组件</label>
                <select
                  [(ngModel)]="action.targetComponentId"
                  (change)="updateComponent()"
                  class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">选择组件</option>
                  <option *ngFor="let comp of allComponents" [value]="comp.id">{{ comp.id }} ({{ comp.type }})</option>
                </select>
              </div>

              <!-- 参数配置 -->
              <div *ngIf="action.type === EventActionType.NAVIGATE">
                <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">跳转URL</label>
                <input
                  type="text"
                  [(ngModel)]="action.params!['url']"
                  (change)="updateComponent()"
                  placeholder="输入URL或路由路径"
                  class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <label class="flex items-center gap-1 mt-1">
                  <input
                    type="checkbox"
                    [checked]="action.params?.['target'] === '_blank'"
                    (change)="ensureParams(action); action.params!['target'] = $any($event.target).checked ? '_blank' : '_self'; updateComponent()"
                    class="w-3 h-3 text-blue-600 rounded"
                  />
                  <span class="text-xs text-gray-500 dark:text-gray-400">新窗口打开</span>
                </label>
              </div>

              <!-- 自定义脚本 -->
              <div *ngIf="action.type === EventActionType.CUSTOM_SCRIPT">
                <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">自定义脚本</label>
                <textarea
                  [(ngModel)]="action.script"
                  (change)="updateComponent()"
                  placeholder="输入JavaScript代码"
                  rows="4"
                  class="w-full px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                ></textarea>
              </div>

              <!-- 条件 -->
              <div>
                <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">执行条件（可选）</label>
                <input
                  type="text"
                  [(ngModel)]="action.condition"
                  (change)="updateComponent()"
                  placeholder="例如: event.sourceComponentId === 'btn1'"
                  class="w-full px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div *ngIf="event.actions.length === 0" class="text-xs text-gray-400 text-center py-2">
              暂无动作
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .event-card {
      transition: all 0.2s ease;
    }
    .event-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class EventConfigPanelComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;

  events: ComponentEvent[] = [];
  expandedEvents = new Set<number>();
  allComponents: ComponentItem[] = [];

  EventType = EventType;
  EventActionType = EventActionType;

  private destroy$ = new Subject<void>();

  constructor(
    private canvasQuery: CanvasQuery,
    private canvasService: CanvasService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadAllComponents();

    this.canvasQuery.componentData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadAllComponents();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEvents(): void {
    this.events = this.component.events ? [...this.component.events] : [];
    this.events.forEach(event => {
      event.actions?.forEach(action => {
        if (!action.params) {
          action.params = {};
        }
      });
    });
    if (this.events.length > 0) {
      this.expandedEvents.add(0);
    }
  }

  private loadAllComponents(): void {
    this.canvasQuery.componentData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((components: ComponentItem[]) => {
      this.allComponents = this.flattenComponents(components).filter(c => c.id !== this.component.id);
    });
  }

  private flattenComponents(components: ComponentItem[]): ComponentItem[] {
    const result: ComponentItem[] = [];
    components.forEach(comp => {
      result.push(comp);
      if (comp.children && comp.children.length > 0) {
        result.push(...this.flattenComponents(comp.children));
      }
    });
    return result;
  }

  addEvent(): void {
    const newEvent: ComponentEvent = {
      id: `event_${Date.now()}`,
      type: EventType.COMPONENT_CLICK,
      trigger: 'click',
      actions: [],
      enabled: true,
      description: ''
    };
    this.events.push(newEvent);
    this.expandedEvents.add(this.events.length - 1);
    this.updateComponent();
  }

  removeEvent(index: number): void {
    this.events.splice(index, 1);
    this.expandedEvents.delete(index);
    this.updateComponent();
  }

  addAction(event: ComponentEvent): void {
    const newAction: EventAction = {
      type: EventActionType.SHOW
    };
    if (!event.actions) {
      event.actions = [];
    }
    event.actions.push(newAction);
    this.updateComponent();
  }

  removeAction(event: ComponentEvent, index: number): void {
    event.actions.splice(index, 1);
    this.updateComponent();
  }

  toggleEventExpanded(index: number): void {
    if (this.expandedEvents.has(index)) {
      this.expandedEvents.delete(index);
    } else {
      this.expandedEvents.add(index);
    }
  }

  needsTargetComponent(actionType: EventActionType): boolean {
    return [
      EventActionType.SHOW,
      EventActionType.HIDE,
      EventActionType.TOGGLE_VISIBILITY,
      EventActionType.UPDATE_DATA
    ].includes(actionType);
  }

  getEventTypeLabel(type: EventType): string {
    const labels: Record<EventType, string> = {
      [EventType.COMPONENT_CLICK]: '组件点击',
      [EventType.COMPONENT_HOVER]: '组件悬停',
      [EventType.COMPONENT_LEAVE]: '组件离开',
      [EventType.DATA_CHANGE]: '数据变化',
      [EventType.CUSTOM]: '自定义'
    };
    return labels[type] || type;
  }

  ensureParams(action: EventAction): void {
    if (!action.params) {
      action.params = {};
    }
  }

  updateComponent(): void {
    this.component.events = [...this.events];
    this.canvasService.updateComponent(this.component.id, { events: this.events });
  }
}
