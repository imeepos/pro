import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export interface ReferenceLine {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  color?: string;
  locked?: boolean;
}

export interface RulerGridState {
  showRuler: boolean;
  showGrid: boolean;
  showReferenceLines: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapThreshold: number;
  referenceLines: ReferenceLine[];
  theme: 'light' | 'dark';
}

export interface GridConfig {
  smallGrid: number;
  largeGrid: number;
}

@Injectable({
  providedIn: 'root'
})
export class RulerGridService {
  private state$ = new BehaviorSubject<RulerGridState>({
    showRuler: true,
    showGrid: true,
    showReferenceLines: true,
    gridSize: 20,
    snapToGrid: true,
    snapThreshold: 3,
    referenceLines: [],
    theme: 'light'
  });

  // 可观察的状态流
  showRuler$ = this.state$.pipe(
    map(state => state.showRuler),
    distinctUntilChanged()
  );

  showGrid$ = this.state$.pipe(
    map(state => state.showGrid),
    distinctUntilChanged()
  );

  showReferenceLines$ = this.state$.pipe(
    map(state => state.showReferenceLines),
    distinctUntilChanged()
  );

  gridSize$ = this.state$.pipe(
    map(state => state.gridSize),
    distinctUntilChanged()
  );

  snapToGrid$ = this.state$.pipe(
    map(state => state.snapToGrid),
    distinctUntilChanged()
  );

  referenceLines$ = this.state$.pipe(
    map(state => state.referenceLines),
    distinctUntilChanged()
  );

  theme$ = this.state$.pipe(
    map(state => state.theme),
    distinctUntilChanged()
  );

  constructor() {}

  // 标尺控制
  toggleRuler(show?: boolean): void {
    const state = this.state$.value;
    const newShowRuler = show !== undefined ? show : !state.showRuler;
    this.state$.next({ ...state, showRuler: newShowRuler });
  }

  // 网格控制
  toggleGrid(show?: boolean): void {
    const state = this.state$.value;
    const newShowGrid = show !== undefined ? show : !state.showGrid;
    this.state$.next({ ...state, showGrid: newShowGrid });
  }

  // 参考线控制
  toggleReferenceLines(show?: boolean): void {
    const state = this.state$.value;
    const newShowReferenceLines = show !== undefined ? show : !state.showReferenceLines;
    this.state$.next({ ...state, showReferenceLines: newShowReferenceLines });
  }

  // 网格大小设置
  setGridSize(size: number): void {
    const state = this.state$.value;
    this.state$.next({ ...state, gridSize: size });
  }

  // 吸附设置
  toggleSnapToGrid(snap?: boolean): void {
    const state = this.state$.value;
    const newSnapToGrid = snap !== undefined ? snap : !state.snapToGrid;
    this.state$.next({ ...state, snapToGrid: newSnapToGrid });
  }

  setSnapThreshold(threshold: number): void {
    const state = this.state$.value;
    this.state$.next({ ...state, snapThreshold: threshold });
  }

  // 主题设置
  setTheme(theme: 'light' | 'dark'): void {
    const state = this.state$.value;
    this.state$.next({ ...state, theme });
  }

  // 参考线管理
  addReferenceLine(line: Omit<ReferenceLine, 'id'>): void {
    const state = this.state$.value;
    const newLine: ReferenceLine = {
      ...line,
      id: this.generateId()
    };
    this.state$.next({
      ...state,
      referenceLines: [...state.referenceLines, newLine]
    });
  }

  updateReferenceLine(id: string, updates: Partial<ReferenceLine>): void {
    const state = this.state$.value;
    const referenceLines = state.referenceLines.map(line =>
      line.id === id ? { ...line, ...updates } : line
    );
    this.state$.next({ ...state, referenceLines });
  }

  removeReferenceLine(id: string): void {
    const state = this.state$.value;
    const referenceLines = state.referenceLines.filter(line => line.id !== id);
    this.state$.next({ ...state, referenceLines });
  }

  clearReferenceLines(): void {
    const state = this.state$.value;
    this.state$.next({ ...state, referenceLines: [] });
  }

  // 获取参考线
  getHorizontalReferenceLines(): ReferenceLine[] {
    return this.state$.value.referenceLines.filter(line => line.type === 'horizontal');
  }

  getVerticalReferenceLines(): ReferenceLine[] {
    return this.state$.value.referenceLines.filter(line => line.type === 'vertical');
  }

  // 网格吸附计算
  snapToGridPosition(value: number): number {
    const state = this.state$.value;
    if (!state.snapToGrid) return value;

    const gridSize = state.gridSize;
    const halfGrid = gridSize / 2;
    const snapped = Math.round(value / gridSize) * gridSize;

    // 检查是否在吸附阈值内
    if (Math.abs(value - snapped) <= state.snapThreshold) {
      return snapped;
    }

    return value;
  }

  // 获取网格配置（基于缩放比例）
  getGridConfig(scale: number): GridConfig {
    const baseSize = this.state$.value.gridSize;

    if (scale <= 0.5) {
      return { smallGrid: baseSize * 2, largeGrid: baseSize * 10 };
    } else if (scale <= 1.5) {
      return { smallGrid: baseSize, largeGrid: baseSize * 5 };
    } else if (scale <= 3) {
      return { smallGrid: baseSize / 2, largeGrid: baseSize * 2 };
    } else {
      return { smallGrid: baseSize / 4, largeGrid: baseSize };
    }
  }

  // 获取当前状态
  getState(): RulerGridState {
    return this.state$.value;
  }

  // 获取主题颜色
  getThemeColors() {
    const theme = this.state$.value.theme;
    if (theme === 'dark') {
      return {
        bgColor: '#2d2d2d',
        longfgColor: '#8b8b8b',
        shortfgColor: '#5a5a5a',
        fontColor: '#b0b0b0',
        shadowColor: 'rgba(255, 255, 255, 0.05)',
        lineColor: '#4a9eff'
      };
    } else {
      return {
        bgColor: '#fafafa',
        longfgColor: '#b1b1b1',
        shortfgColor: '#d8d8d8',
        fontColor: '#6f6f6f',
        shadowColor: 'rgba(6, 0, 1, 0.05)',
        lineColor: '#51d3db'
      };
    }
  }

  private generateId(): string {
    return `ref-line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}