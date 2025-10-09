import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { CanvasStore, CanvasState } from './canvas.store';
import { Observable } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CanvasQuery extends Query<CanvasState> {
  componentData$ = this.select('componentData');
  activeComponentId$ = this.select('activeComponentId');
  selectedComponentIds$ = this.select('selectedComponentIds');
  scale$ = this.select('scale');
  canvasStyle$ = this.select('canvasStyle');
  editMode$ = this.select('editMode');
  showGrid$ = this.select('showGrid');
  snapToGrid$ = this.select('snapToGrid');
  gridSize$ = this.select('gridSize');
  darkTheme$ = this.select('darkTheme');
  showMarkLine$ = this.select(state => state.showMarkLine);
  isDirty$ = this.select('isDirty');
  saveStatus$ = this.select('saveStatus');
  lastSaveError$ = this.select('lastSaveError');
  retryCount$ = this.select('retryCount');
  isOnline$ = this.select('isOnline');
  networkStatus$ = this.select('networkStatus');

  activeComponent$ = this.select(
    state => state.componentData.find(comp => comp.id === state.activeComponentId)
  );

  selectedComponents$ = this.select(
    state => state.componentData.filter(comp => state.selectedComponentIds.includes(comp.id))
  );

  constructor(protected override store: CanvasStore) {
    super(store);
  }

  getComponentById(id: string): ComponentItem | undefined {
    return this.getValue().componentData.find((comp) => comp.id === id);
  }

  getActiveComponent(): ComponentItem | undefined {
    const activeId = this.getValue().activeComponentId;
    return activeId ? this.getComponentById(activeId) : undefined;
  }

  getSelectedComponents(): ComponentItem[] {
    const ids = this.getValue().selectedComponentIds;
    return this.getValue().componentData.filter(c => ids.includes(c.id));
  }

  // 错误状态相关查询
  getSaveError(): any {
    return this.getValue().lastSaveError;
  }

  getRetryCount(): number {
    return this.getValue().retryCount;
  }

  getNetworkStatus(): { isOnline: boolean; status: string } {
    const state = this.getValue();
    return {
      isOnline: state.isOnline,
      status: state.networkStatus
    };
  }

  // 组合查询 - 是否需要显示错误提示
  showSaveError$ = this.select([
    state => state.saveStatus,
    state => state.lastSaveError
  ]).pipe(
    map(([saveStatus, error]) => saveStatus === 'error' && error !== null)
  );

  // 组合查询 - 是否正在重试
  isRetrying$ = this.select('saveStatus').pipe(
    map(status => status === 'retrying')
  );

  // 组合查询 - 是否可以重试
  canRetry$ = this.select([
    state => state.saveStatus,
    state => state.lastSaveError,
    state => state.retryCount
  ]).pipe(
    map(([saveStatus, error, retryCount]) => {
      if (saveStatus !== 'error' || !error || !error.retryable) {
        return false;
      }
      return retryCount < 3; // MAX_RETRY_COUNT
    })
  );

  // 组合查询 - 获取用户友好的错误信息
  userFriendlyErrorMessage$ = this.select([
    state => state.lastSaveError,
    state => state.retryCount
  ]).pipe(
    map(([error, retryCount]) => {
      if (!error) return '';

      let message = error.message;
      if (retryCount > 0) {
        message += ` (已重试 ${retryCount} 次)`;
      }

      if (error.retryable && retryCount < 3) {
        message += ' 系统将自动重试。';
      } else if (!error.retryable) {
        message += ' 请重新登录后再试。';
      } else {
        message += ' 请手动重试或检查网络。';
      }

      return message;
    })
  );
}
