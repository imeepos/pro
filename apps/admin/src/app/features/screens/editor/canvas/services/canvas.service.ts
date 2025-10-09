import { Injectable, OnDestroy } from '@angular/core';
import { CanvasStore } from './canvas.store';
import { CanvasQuery } from './canvas.query';
import { SnapshotService } from './snapshot.service';
import { ComponentItem, ComponentStyle } from '../../models/component.model';
import { EditMode } from '../../models/canvas.model';
import { Subject, BehaviorSubject, Observable, merge, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { ScreenApiService, UpdateScreenDto } from '../../../../../core/services/screen-api.service';

@Injectable({ providedIn: 'root' })
export class CanvasService implements OnDestroy {
  private clipboard: ComponentItem[] = [];
  private destroy$ = new Subject<void>();
  private saveTrigger$ = new Subject<void>();
  private immediateSave$ = new Subject<void>();
  private currentPageId: string | null = null;
  private readonly DEBOUNCE_TIME = 2500; // 2.5秒防抖时间

  constructor(
    private store: CanvasStore,
    private query: CanvasQuery,
    private snapshotService: SnapshotService,
    private screenApi: ScreenApiService
  ) {
    this.initAutoSave();
  }

  initPage(pageId: string): void {
    this.currentPageId = pageId;
    this.snapshotService.setPageId(pageId);
    this.setDirty(false);
    this.setSaveStatus('saved');
  }

  setCanvasSize(width: number, height: number): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        width,
        height
      }
    }));
    this.triggerAutoSave();
  }

  addComponent(component: ComponentItem): void {
    this.store.update((state) => ({
      componentData: [...state.componentData, component]
    }));
    this.recordSnapshot();
    this.triggerAutoSave();
  }

  removeComponent(id: string): void {
    this.store.update((state) => ({
      componentData: state.componentData.filter((c) => c.id !== id),
      activeComponentId: state.activeComponentId === id ? null : state.activeComponentId
    }));
    this.recordSnapshot();
    this.triggerAutoSave();
  }

  updateComponent(id: string, updates: Partial<ComponentItem>): void {
    this.store.update((state) => ({
      componentData: state.componentData.map((comp) =>
        comp.id === id ? { ...comp, ...updates } : comp
      )
    }));
    this.triggerAutoSave();
  }

  updateComponentStyle(id: string, style: Partial<ComponentStyle>): void {
    this.store.update((state) => ({
      componentData: state.componentData.map((comp) =>
        comp.id === id
          ? { ...comp, style: { ...comp.style, ...style } }
          : comp
      )
    }));
    this.triggerAutoSave();
  }

  activateComponent(id: string): void {
    this.store.update({ activeComponentId: id });
  }

  deactivateComponent(): void {
    this.store.update({ activeComponentId: null });
  }

  setScale(scale: number): void {
    this.store.update({ scale: Math.max(0.1, Math.min(3, scale)) });
  }

  zoomIn(): void {
    const currentScale = this.query.getValue().scale;
    this.setScale(currentScale + 0.1);
  }

  zoomOut(): void {
    const currentScale = this.query.getValue().scale;
    this.setScale(currentScale - 0.1);
  }

  setEditMode(mode: EditMode): void {
    this.store.update({ editMode: mode });
  }

  toggleGrid(): void {
    this.store.update((state) => ({ showGrid: !state.showGrid }));
  }

  toggleTheme(): void {
    this.store.update((state) => ({ darkTheme: !state.darkTheme }));
  }

  toggleSnapToGrid(): void {
    this.store.update((state) => ({ snapToGrid: !state.snapToGrid }));
  }

  toggleMarkLine(): void {
    this.store.update((state) => ({ showMarkLine: !state.showMarkLine }));
  }

  setGridSize(size: number): void {
    this.store.update({ gridSize: Math.max(1, Math.min(100, size)) });
  }

  snapToGrid(value: number): number {
    const state = this.query.getValue();
    if (!state.snapToGrid) return value;
    return Math.round(value / state.gridSize) * state.gridSize;
  }

  clearCanvas(): void {
    this.store.update({
      componentData: [],
      activeComponentId: null,
      selectedComponentIds: []
    });
  }

  selectMultipleComponents(ids: string[]): void {
    this.store.update({ selectedComponentIds: ids });
  }

  addToSelection(id: string): void {
    const current = this.query.getValue().selectedComponentIds;
    if (!current.includes(id)) {
      this.store.update({ selectedComponentIds: [...current, id] });
    }
  }

  removeFromSelection(id: string): void {
    const current = this.query.getValue().selectedComponentIds;
    this.store.update({
      selectedComponentIds: current.filter(compId => compId !== id)
    });
  }

  clearSelection(): void {
    this.store.update({ selectedComponentIds: [] });
  }

  batchDelete(ids: string[]): void {
    this.store.update(state => ({
      componentData: state.componentData.filter(c => !ids.includes(c.id)),
      activeComponentId: ids.includes(state.activeComponentId ?? '') ? null : state.activeComponentId,
      selectedComponentIds: []
    }));
    this.triggerAutoSave();
  }

  batchAlign(ids: string[], type: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'): void {
    const components = this.query.getValue().componentData.filter(c => ids.includes(c.id));
    if (components.length < 2) return;

    let targetValue: number;

    switch (type) {
      case 'left':
        targetValue = Math.min(...components.map(c => c.style.left));
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id) ? { ...c, style: { ...c.style, left: targetValue } } : c
          )
        }));
        break;

      case 'right':
        targetValue = Math.max(...components.map(c => c.style.left + c.style.width));
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id)
              ? { ...c, style: { ...c.style, left: targetValue - c.style.width } }
              : c
          )
        }));
        break;

      case 'top':
        targetValue = Math.min(...components.map(c => c.style.top));
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id) ? { ...c, style: { ...c.style, top: targetValue } } : c
          )
        }));
        break;

      case 'bottom':
        targetValue = Math.max(...components.map(c => c.style.top + c.style.height));
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id)
              ? { ...c, style: { ...c.style, top: targetValue - c.style.height } }
              : c
          )
        }));
        break;

      case 'centerH':
        const avgLeft = components.reduce((sum, c) => sum + c.style.left + c.style.width / 2, 0) / components.length;
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id)
              ? { ...c, style: { ...c.style, left: avgLeft - c.style.width / 2 } }
              : c
          )
        }));
        break;

      case 'centerV':
        const avgTop = components.reduce((sum, c) => sum + c.style.top + c.style.height / 2, 0) / components.length;
        this.store.update(state => ({
          componentData: state.componentData.map(c =>
            ids.includes(c.id)
              ? { ...c, style: { ...c.style, top: avgTop - c.style.height / 2 } }
              : c
          )
        }));
        break;
    }
    this.triggerAutoSave();
  }

  distributeHorizontally(ids: string[]): void {
    const components = this.query.getValue().componentData.filter(c => ids.includes(c.id));
    if (components.length < 3) return;

    const sorted = [...components].sort((a, b) => a.style.left - b.style.left);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = (last.style.left + last.style.width) - first.style.left;
    const gap = (totalWidth - sorted.reduce((sum, c) => sum + c.style.width, 0)) / (sorted.length - 1);

    let currentLeft = first.style.left + first.style.width + gap;

    this.store.update(state => ({
      componentData: state.componentData.map(c => {
        const index = sorted.findIndex(sc => sc.id === c.id);
        if (index > 0 && index < sorted.length - 1) {
          const newLeft = currentLeft;
          currentLeft += c.style.width + gap;
          return { ...c, style: { ...c.style, left: newLeft } };
        }
        return c;
      })
    }));
    this.triggerAutoSave();
  }

  distributeVertically(ids: string[]): void {
    const components = this.query.getValue().componentData.filter(c => ids.includes(c.id));
    if (components.length < 3) return;

    const sorted = [...components].sort((a, b) => a.style.top - b.style.top);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = (last.style.top + last.style.height) - first.style.top;
    const gap = (totalHeight - sorted.reduce((sum, c) => sum + c.style.height, 0)) / (sorted.length - 1);

    let currentTop = first.style.top + first.style.height + gap;

    this.store.update(state => ({
      componentData: state.componentData.map(c => {
        const index = sorted.findIndex(sc => sc.id === c.id);
        if (index > 0 && index < sorted.length - 1) {
          const newTop = currentTop;
          currentTop += c.style.height + gap;
          return { ...c, style: { ...c.style, top: newTop } };
        }
        return c;
      })
    }));
    this.triggerAutoSave();
  }

  recordSnapshot(): void {
    const state = this.query.getValue();
    this.snapshotService.recordSnapshot(state);
  }

  undo(): void {
    const previousState = this.snapshotService.undo();
    if (previousState) {
      this.store.update(previousState);
    }
  }

  redo(): void {
    const nextState = this.snapshotService.redo();
    if (nextState) {
      this.store.update(nextState);
    }
  }

  canUndo(): boolean {
    return this.snapshotService.canUndo();
  }

  canRedo(): boolean {
    return this.snapshotService.canRedo();
  }

  updateComponentZIndex(id: string, zIndex: number): void {
    this.updateComponentStyle(id, { zIndex });
    this.recordSnapshot();
  }

  toggleComponentVisibility(id: string): void {
    this.store.update((state) => ({
      componentData: state.componentData.map((comp) =>
        comp.id === id ? { ...comp, display: comp.display !== false ? false : true } : comp
      )
    }));
    this.recordSnapshot();
    this.triggerAutoSave();
  }

  toggleComponentLock(id: string): void {
    this.store.update((state) => ({
      componentData: state.componentData.map((comp) =>
        comp.id === id ? { ...comp, locked: !comp.locked } : comp
      )
    }));
    this.recordSnapshot();
    this.triggerAutoSave();
  }

  duplicateComponent(id: string): void {
    const component = this.query.getValue().componentData.find(c => c.id === id);
    if (!component) return;

    const newComponent = this.deepCloneComponent(component);
    newComponent.id = this.generateId();
    newComponent.style = {
      ...newComponent.style,
      left: component.style.left + 20,
      top: component.style.top + 20
    };

    this.addComponent(newComponent);
  }

  copyComponents(): void {
    const state = this.query.getValue();
    const selectedIds = state.selectedComponentIds.length > 0
      ? state.selectedComponentIds
      : state.activeComponentId
      ? [state.activeComponentId]
      : [];

    if (selectedIds.length === 0) return;

    const components = state.componentData.filter(c => selectedIds.includes(c.id));
    this.clipboard = components.map(c => this.deepCloneComponent(c));
  }

  pasteComponents(): void {
    if (this.clipboard.length === 0) return;

    const newComponents = this.clipboard.map(component => {
      const newComponent = this.deepCloneComponent(component);
      newComponent.id = this.generateId();
      newComponent.style = {
        ...newComponent.style,
        left: component.style.left + 20,
        top: component.style.top + 20
      };

      if (newComponent.isGroup && newComponent.children) {
        newComponent.children = this.cloneChildren(newComponent.children);
      }

      return newComponent;
    });

    this.store.update(state => ({
      componentData: [...state.componentData, ...newComponents]
    }));

    const newIds = newComponents.map(c => c.id);
    this.selectMultipleComponents(newIds);
    this.recordSnapshot();
    this.triggerAutoSave();
  }

  cutComponents(): void {
    const state = this.query.getValue();
    const selectedIds = state.selectedComponentIds.length > 0
      ? state.selectedComponentIds
      : state.activeComponentId
      ? [state.activeComponentId]
      : [];

    if (selectedIds.length === 0) return;

    this.copyComponents();
    this.batchDelete(selectedIds);
    this.recordSnapshot();
  }

  private deepCloneComponent(component: ComponentItem): ComponentItem {
    return {
      ...component,
      style: { ...component.style },
      config: JSON.parse(JSON.stringify(component.config)),
      children: component.children ? this.cloneChildren(component.children) : undefined
    };
  }

  private cloneChildren(children: ComponentItem[]): ComponentItem[] {
    return children.map(child => {
      const cloned = this.deepCloneComponent(child);
      cloned.id = this.generateId();
      return cloned;
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  composeComponents(componentIds: string[]): void {
    if (componentIds.length < 2) return;

    const state = this.query.getValue();
    const components = state.componentData.filter(c => componentIds.includes(c.id));
    if (components.length < 2) return;

    const minLeft = Math.min(...components.map(c => c.style.left));
    const minTop = Math.min(...components.map(c => c.style.top));
    const maxRight = Math.max(...components.map(c => c.style.left + c.style.width));
    const maxBottom = Math.max(...components.map(c => c.style.top + c.style.height));

    const width = maxRight - minLeft;
    const height = maxBottom - minTop;

    const childrenWithRelativePosition = components.map(comp => ({
      ...comp,
      style: {
        ...comp.style,
        left: comp.style.left - minLeft,
        top: comp.style.top - minTop
      }
    }));

    const maxZIndex = Math.max(...components.map(c => c.style.zIndex ?? 0), 0);

    const groupComponent: ComponentItem = {
      id: `group_${Date.now()}`,
      type: 'Group',
      component: 'Group',
      style: {
        left: minLeft,
        top: minTop,
        width,
        height,
        rotate: 0,
        zIndex: maxZIndex
      },
      config: {},
      isGroup: true,
      children: childrenWithRelativePosition
    };

    this.store.update(state => ({
      componentData: [
        ...state.componentData.filter(c => !componentIds.includes(c.id)),
        groupComponent
      ],
      activeComponentId: groupComponent.id,
      selectedComponentIds: []
    }));

    this.recordSnapshot();
    this.triggerAutoSave();
  }

  decomposeComponent(groupId: string): void {
    const state = this.query.getValue();
    const groupComponent = state.componentData.find(c => c.id === groupId);

    if (!groupComponent?.isGroup || !groupComponent.children) return;

    const restoredComponents = groupComponent.children.map(child => ({
      ...child,
      style: {
        ...child.style,
        left: child.style.left + groupComponent.style.left,
        top: child.style.top + groupComponent.style.top
      }
    }));

    this.store.update(state => ({
      componentData: [
        ...state.componentData.filter(c => c.id !== groupId),
        ...restoredComponents
      ],
      activeComponentId: null,
      selectedComponentIds: restoredComponents.map(c => c.id)
    }));

    this.recordSnapshot();
    this.triggerAutoSave();
  }

  selectAll(): void {
    const state = this.query.getValue();
    const allIds = state.componentData
      .filter(c => !c.locked)
      .map(c => c.id);

    if (allIds.length > 0) {
      this.selectMultipleComponents(allIds);
      this.deactivateComponent();
    }
  }

  deleteSelected(): void {
    const state = this.query.getValue();
    const selectedIds = state.selectedComponentIds.length > 0
      ? state.selectedComponentIds
      : state.activeComponentId
      ? [state.activeComponentId]
      : [];

    if (selectedIds.length === 0) return;

    const unlocked = selectedIds.filter(id => {
      const component = state.componentData.find(c => c.id === id);
      return component && !component.locked;
    });

    if (unlocked.length > 0) {
      this.batchDelete(unlocked);
      this.recordSnapshot();
    }
  }

  moveComponent(id: string, deltaX: number, deltaY: number): void {
    const component = this.query.getValue().componentData.find(c => c.id === id);
    if (!component || component.locked) return;

    this.updateComponentStyle(id, {
      left: component.style.left + deltaX,
      top: component.style.top + deltaY
    });
    this.triggerAutoSave();
  }

  // 状态管理方法
  setDirty(isDirty: boolean): void {
    this.store.update({ isDirty });
    if (isDirty) {
      this.setSaveStatus('unsaved');
    }
  }

  setSaveStatus(status: 'saved' | 'saving' | 'unsaved' | 'error'): void {
    this.store.update({ saveStatus: status });
  }

  // 自动保存相关方法
  private initAutoSave(): void {
    // 合并防抖保存和立即保存触发器
    merge(
      this.saveTrigger$.pipe(
        debounceTime(this.DEBOUNCE_TIME),
        tap(() => console.log('防抖保存触发'))
      ),
      this.immediateSave$.pipe(
        tap(() => console.log('立即保存触发'))
      )
    ).pipe(
      distinctUntilChanged(),
      switchMap(() => {
        const pendingPageName = (this as any).pendingPageName;
        // 清除待保存的页面名称
        delete (this as any).pendingPageName;
        return this.performSave(pendingPageName);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  triggerAutoSave(): void {
    if (!this.currentPageId) return;

    this.setDirty(true);
    this.saveTrigger$.next();
  }

  triggerImmediateSave(pageName?: string): void {
    if (!this.currentPageId) return;

    this.setDirty(true);
    // 将页面名称保存在临时属性中，供performSave使用
    if (pageName) {
      (this as any).pendingPageName = pageName;
    }
    this.immediateSave$.next();
  }

  private performSave(pageName?: string): Observable<unknown> {
    if (!this.currentPageId) {
      return new Observable(observer => {
        observer.error(new Error('未设置页面ID'));
      });
    }

    const state = this.query.getValue();

    // 转换画布数据为API格式
    const updateDto: UpdateScreenDto = {
      name: pageName,
      layout: {
        cols: Math.floor(state.canvasStyle.width / 50), // 假设每列50px
        rows: Math.floor(state.canvasStyle.height / 50) // 假设每行50px
      },
      components: this.convertComponentsToApiFormat(state.componentData)
    };

    this.setSaveStatus('saving');

    return this.screenApi.updateScreen(this.currentPageId, updateDto).pipe(
      tap(() => {
        this.setDirty(false);
        this.setSaveStatus('saved');
        console.log('画布保存成功');
      }),
      catchError(error => {
        this.setSaveStatus('error');
        console.error('画布保存失败:', error);
        throw error;
      })
    );
  }

  private convertComponentsToApiFormat(components: ComponentItem[]): any[] {
    return components.map(comp => ({
      id: comp.id,
      type: comp.type,
      position: {
        x: comp.style.left,
        y: comp.style.top,
        width: comp.style.width,
        height: comp.style.height,
        zIndex: comp.style.zIndex || 0
      },
      config: comp.config
    }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
