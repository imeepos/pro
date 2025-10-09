import { Injectable, OnDestroy } from '@angular/core';
import { CanvasStore, SaveError } from './canvas.store';
import { CanvasQuery } from './canvas.query';
import { SnapshotService } from './snapshot.service';
import { ComponentItem, ComponentStyle } from '../../models/component.model';
import { EditMode } from '../../models/canvas.model';
import { Subject, BehaviorSubject, Observable, merge, timer, EMPTY, throwError } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, catchError, delay, retryWhen, scan, finalize } from 'rxjs/operators';
import { ScreenApiService, UpdateScreenDto } from '../../../../../core/services/screen-api.service';

@Injectable({ providedIn: 'root' })
export class CanvasService implements OnDestroy {
  private clipboard: ComponentItem[] = [];
  private destroy$ = new Subject<void>();
  private saveTrigger$ = new Subject<void>();
  private immediateSave$ = new Subject<void>();
  private manualRetry$ = new Subject<void>();
  private currentPageId: string | null = null;
  private currentScreenName: string | null = null;
  private readonly DEBOUNCE_TIME = 2500; // 2.5秒防抖时间
  private readonly MAX_RETRY_COUNT = 3; // 最大重试次数
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // 重试延迟：1秒、2秒、4秒
  private pendingSaveData: { pageName?: string } | null = null; // 待保存的数据
  private isRetryInProgress = false; // 是否正在重试

  constructor(
    private store: CanvasStore,
    private query: CanvasQuery,
    private snapshotService: SnapshotService,
    private screenApi: ScreenApiService
  ) {
    this.initNetworkMonitoring();
    this.initAutoSave();
  }

  initPage(pageId: string): void {
    this.currentPageId = pageId;
    this.snapshotService.setPageId(pageId);
    this.clearErrorState();
    this.setDirty(false);
    this.setSaveStatus('saved');
  }

  setCurrentScreenName(screenName: string): void {
    this.currentScreenName = screenName;
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

  updateCanvasStyle(updates: Partial<import('../../models/canvas.model').CanvasStyle>): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        ...updates
      }
    }));
    this.triggerAutoSave();
  }

  setCanvasBackground(background: string | import('../../models/canvas.model').BackgroundStyle): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        background
      }
    }));
    this.triggerAutoSave();
  }

  setCanvasClassName(className: string): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        className
      }
    }));
    this.triggerAutoSave();
  }

  setCanvasDataAttrs(dataAttrs: Record<string, string>): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        dataAttrs
      }
    }));
    this.triggerAutoSave();
  }

  setCanvasDescription(description: string): void {
    this.store.update(state => ({
      canvasStyle: {
        ...state.canvasStyle,
        description
      }
    }));
    this.triggerAutoSave();
  }

  applyResolutionPreset(width: number, height: number): void {
    this.setCanvasSize(width, height);
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

  toggleCoordinates(): void {
    this.store.update((state) => ({ isShowCoordinates: !state.isShowCoordinates }));
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

  setSaveStatus(status: 'saved' | 'saving' | 'unsaved' | 'error' | 'retrying'): void {
    this.store.update({ saveStatus: status });
  }

  // 错误状态管理
  setErrorState(error: SaveError): void {
    this.store.update({
      lastSaveError: error,
      retryCount: this.query.getValue().retryCount + 1
    });
  }

  clearErrorState(): void {
    this.store.update({
      lastSaveError: null,
      retryCount: 0
    });
  }

  // 网络状态管理
  updateNetworkStatus(isOnline: boolean, status: 'online' | 'offline' | 'checking'): void {
    this.store.update({
      isOnline,
      networkStatus: status
    });
  }

  // 错误分类和处理
  private classifyError(error: any): SaveError {
    const timestamp = Date.now();

    if (error.name === 'HttpErrorResponse') {
      if (error.status === 0) {
        return {
          type: 'network',
          message: '网络连接失败，请检查网络设置',
          timestamp,
          retryable: true
        };
      } else if (error.status === 401 || error.status === 403) {
        return {
          type: 'permission',
          message: '权限不足，请重新登录',
          timestamp,
          retryable: false
        };
      } else if (error.status >= 500) {
        return {
          type: 'server',
          message: '服务器错误，请稍后重试',
          timestamp,
          retryable: true
        };
      } else if (error.status === 408) {
        return {
          type: 'timeout',
          message: '请求超时，请检查网络连接',
          timestamp,
          retryable: true
        };
      }
    }

    if (error.name === 'TimeoutError') {
      return {
        type: 'timeout',
        message: '请求超时，请稍后重试',
        timestamp,
        retryable: true
      };
    }

    return {
      type: 'unknown',
      message: error.message || '未知错误',
      timestamp,
      retryable: true
    };
  }

  // 网络状态监听
  private initNetworkMonitoring(): void {
    this.updateNetworkStatus(navigator.onLine, 'online');

    const handleOnline = () => {
      this.updateNetworkStatus(true, 'online');
      console.log('网络连接已恢复');
      // 网络恢复后检查是否有未保存的数据
      this.retryPendingSave();
    };

    const handleOffline = () => {
      this.updateNetworkStatus(false, 'offline');
      console.log('网络连接已断开');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.destroy$.subscribe(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    // 定期检查网络状态
    timer(0, 30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.checkNetworkStatus();
    });
  }

  private checkNetworkStatus(): void {
    this.updateNetworkStatus(navigator.onLine, 'checking');
  }

  // 网络恢复后重试保存
  private retryPendingSave(): void {
    const state = this.query.getValue();
    if (state.isDirty && state.saveStatus === 'error' && !this.isRetryInProgress) {
      console.log('网络恢复，重试保存未保存的数据');
      this.triggerImmediateSave();
    }
  }

  // 自动保存相关方法
  private initAutoSave(): void {
    // 合并防抖保存、立即保存和手动重试触发器
    merge(
      this.saveTrigger$.pipe(
        debounceTime(this.DEBOUNCE_TIME),
        tap(() => console.log('防抖保存触发'))
      ),
      this.immediateSave$.pipe(
        tap(() => console.log('立即保存触发'))
      ),
      this.manualRetry$.pipe(
        tap(() => console.log('手动重试保存触发'))
      )
    ).pipe(
      distinctUntilChanged(),
      switchMap(() => {
        const pageName = this.pendingSaveData?.pageName;
        // 清除待保存的数据
        this.pendingSaveData = null;
        return this.performSaveWithRetry(pageName);
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
    // 如果没有提供页面名称，使用当前屏幕名称
    const finalPageName = pageName || this.currentScreenName || '未命名页面';
    // 保存待保存的数据
    this.pendingSaveData = { pageName: finalPageName };
    this.immediateSave$.next();
  }

  // 手动重试保存
  manualRetrySave(): void {
    if (!this.currentPageId) {
      console.warn('未设置页面ID，无法重试保存');
      return;
    }

    const state = this.query.getValue();
    if (state.saveStatus !== 'error') {
      console.log('当前没有错误状态，无需重试');
      return;
    }

    this.clearErrorState();
    this.manualRetry$.next();
  }

  // 强制保存（忽略错误）
  forceSave(): void {
    if (!this.currentPageId) {
      console.warn('未设置页面ID，无法强制保存');
      return;
    }

    this.clearErrorState();
    this.setDirty(true);
    const pageName: string | undefined = this.pendingSaveData?.pageName;
    this.pendingSaveData = null;
    this.performSave(pageName).subscribe({
      error: (error) => {
        console.error('强制保存失败:', error);
        this.setSaveStatus('error');
      }
    });
  }

  // 带重试机制的保存方法
  private performSaveWithRetry(pageName?: string): Observable<unknown> {
    if (!this.currentPageId) {
      return throwError(() => new Error('未设置页面ID'));
    }

    const state = this.query.getValue();

    // 检查网络状态
    if (!state.isOnline) {
      const networkError: SaveError = {
        type: 'network',
        message: '网络连接不可用，请检查网络设置',
        timestamp: Date.now(),
        retryable: true
      };
      this.setErrorState(networkError);
      this.setSaveStatus('error');
      return EMPTY; // 网络不可用时不执行保存
    }

    this.setSaveStatus('saving');

    return this.performSave(pageName).pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((errorCount, error) => {
            const saveError = this.classifyError(error);

            // 如果错误不可重试，直接抛出错误
            if (!saveError.retryable) {
              this.setErrorState(saveError);
              this.setSaveStatus('error');
              throw error;
            }

            // 如果超过最大重试次数，抛出错误
            if (errorCount >= this.MAX_RETRY_COUNT) {
              console.error(`保存失败，已达到最大重试次数 ${this.MAX_RETRY_COUNT}`);
              saveError.message = `保存失败，已重试 ${this.MAX_RETRY_COUNT} 次，请检查网络或手动重试`;
              this.setErrorState(saveError);
              this.setSaveStatus('error');
              throw error;
            }

            // 更新重试状态
            this.setSaveStatus('retrying');
            this.isRetryInProgress = true;

            // 计算延迟时间（指数退避）
            const delay = this.RETRY_DELAYS[errorCount];
            console.log(`保存失败，${delay}ms 后进行第 ${errorCount + 1} 次重试...`);

            return errorCount + 1;
          }, 0),
          switchMap(errorCount => {
            const delay = this.RETRY_DELAYS[errorCount - 1] || 1000;
            return timer(delay);
          }),
          finalize(() => {
            this.isRetryInProgress = false;
          })
        )
      ),
      catchError(error => {
        const saveError = this.classifyError(error);
        this.setErrorState(saveError);
        this.setSaveStatus('error');
        console.error('保存失败:', error);
        return EMPTY; // 返回空流，避免中断订阅
      })
    );
  }

  private performSave(pageName?: string): Observable<unknown> {
    if (!this.currentPageId) {
      return throwError(() => new Error('未设置页面ID'));
    }

    const state = this.query.getValue();

    // 转换画布数据为API格式
    const updateDto: UpdateScreenDto = {
      name: pageName,
      layout: {
        width: state.canvasStyle.width,
        height: state.canvasStyle.height
      },
      components: this.convertComponentsToApiFormat(state.componentData)
    };

    return this.screenApi.updateScreen(this.currentPageId, updateDto).pipe(
      tap(() => {
        this.clearErrorState();
        this.setDirty(false);
        this.setSaveStatus('saved');
        console.log('画布保存成功');
      }),
      catchError(error => {
        throw error; // 让重试机制处理错误
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

  // 公共方法 - 获取错误状态信息
  getErrorState(): SaveError | null {
    return this.query.getValue().lastSaveError;
  }

  // 公共方法 - 获取重试次数
  getRetryCount(): number {
    return this.query.getValue().retryCount;
  }

  // 公共方法 - 获取网络状态
  getNetworkStatus(): { isOnline: boolean; status: 'online' | 'offline' | 'checking' } {
    const state = this.query.getValue();
    return {
      isOnline: state.isOnline,
      status: state.networkStatus
    };
  }

  // 公共方法 - 获取保存状态
  getSaveStatus(): 'saved' | 'saving' | 'unsaved' | 'error' | 'retrying' {
    return this.query.getValue().saveStatus;
  }

  // 公共方法 - 获取用户友好的错误提示
  getUserFriendlyErrorMessage(): string {
    const error = this.getErrorState();
    if (!error) return '';

    const retryCount = this.getRetryCount();
    let message = error.message;

    if (retryCount > 0) {
      message += ` (已重试 ${retryCount} 次)`;
    }

    if (error.retryable && retryCount < this.MAX_RETRY_COUNT) {
      message += ' 系统将自动重试。';
    } else if (!error.retryable) {
      message += ' 请重新登录后再试。';
    } else {
      message += ' 请手动重试或检查网络。';
    }

    return message;
  }

  // 公共方法 - 检查是否可以重试
  canRetry(): boolean {
    const state = this.query.getValue();
    const error = state.lastSaveError;

    if (!error || !error.retryable) {
      return false;
    }

    // 检查是否已达到最大重试次数
    if (state.retryCount >= this.MAX_RETRY_COUNT) {
      return false;
    }

    return state.saveStatus === 'error';
  }

  // 公共方法 - 检查是否正在重试
  isRetrying(): boolean {
    return this.query.getValue().saveStatus === 'retrying' || this.isRetryInProgress;
  }

  setFullscreenState(isFullscreen: boolean): void {
    this.store.update({ isFullscreen });

    if (isFullscreen) {
      this.setEditMode('preview');
    } else {
      this.setEditMode('edit');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
