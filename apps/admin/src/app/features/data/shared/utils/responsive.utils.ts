import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, fromEvent, map, distinctUntilChanged } from 'rxjs';

export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

export interface ResponsiveState {
  breakpoint: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private window = inject(Window);

  // 默认断点配置
  private breakpoints: Breakpoint[] = [
    { name: 'xs', minWidth: 0, maxWidth: 639 },
    { name: 'sm', minWidth: 640, maxWidth: 767 },
    { name: 'md', minWidth: 768, maxWidth: 1023 },
    { name: 'lg', minWidth: 1024, maxWidth: 1279 },
    { name: 'xl', minWidth: 1280, maxWidth: 1535 },
    { name: '2xl', minWidth: 1536 }
  ];

  private resizeSubject = new BehaviorSubject<ResponsiveState>(this.getCurrentState());

  // 响应式状态流
  responsive$ = this.resizeSubject.asObservable();
  breakpoint$ = this.responsive$.pipe(map(state => state.breakpoint), distinctUntilChanged());
  isMobile$ = this.responsive$.pipe(map(state => state.isMobile), distinctUntilChanged());
  isTablet$ = this.responsive$.pipe(map(state => state.isTablet), distinctUntilChanged());
  isDesktop$ = this.responsive$.pipe(map(state => state.isDesktop), distinctUntilChanged());

  constructor() {
    this.initializeResponsive();
  }

  // 初始化响应式监听
  private initializeResponsive(): void {
    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize').pipe(
        map(() => this.getCurrentState()),
        distinctUntilChanged((prev, curr) =>
          prev.breakpoint === curr.breakpoint &&
          prev.screenWidth === curr.screenWidth
        )
      ).subscribe(state => {
        this.resizeSubject.next(state);
      });

      // 初始状态
      this.resizeSubject.next(this.getCurrentState());
    }
  }

  // 获取当前响应式状态
  private getCurrentState(): ResponsiveState {
    const width = this.window.innerWidth || 1024;
    const height = this.window.innerHeight || 768;
    const currentBreakpoint = this.getBreakpoint(width);

    return {
      breakpoint: currentBreakpoint,
      isMobile: ['xs', 'sm'].includes(currentBreakpoint),
      isTablet: currentBreakpoint === 'md',
      isDesktop: ['lg', 'xl', '2xl'].includes(currentBreakpoint),
      screenWidth: width,
      screenHeight: height
    };
  }

  // 获取当前断点
  private getBreakpoint(width: number): string {
    for (let i = this.breakpoints.length - 1; i >= 0; i--) {
      const breakpoint = this.breakpoints[i];
      if (width >= breakpoint.minWidth) {
        if (!breakpoint.maxWidth || width <= breakpoint.maxWidth) {
          return breakpoint.name;
        }
      }
    }
    return 'xs';
  }

  // 获取当前状态
  getCurrentStateSync(): ResponsiveState {
    return this.resizeSubject.value;
  }

  // 检查是否匹配断点
  matchesBreakpoint(breakpointName: string): boolean {
    return this.resizeSubject.value.breakpoint === breakpointName;
  }

  // 检查是否在断点范围内
  matchesBreakpoints(minBreakpoint: string, maxBreakpoint?: string): boolean {
    const state = this.resizeSubject.value;
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === state.breakpoint);
    const minIndex = this.breakpoints.findIndex(bp => bp.name === minBreakpoint);
    const maxIndex = maxBreakpoint ? this.breakpoints.findIndex(bp => bp.name === maxBreakpoint) : this.breakpoints.length - 1;

    return currentIndex >= minIndex && currentIndex <= maxIndex;
  }

  // 获取响应式类名
  getResponsiveClass(baseClass: string, modifiers: Record<string, string>): string {
    const state = this.getCurrentStateSync();
    const classes = [baseClass];

    Object.entries(modifiers).forEach(([breakpoint, modifier]) => {
      if (breakpoint === 'base') {
        classes.push(`${baseClass}--${modifier}`);
      } else if (state.breakpoint === breakpoint) {
        classes.push(`${baseClass}--${modifier}`);
      }
    });

    return classes.join(' ');
  }

  // 获取响应式样式值
  getResponsiveValue<T>(values: Record<string, T>, defaultValue?: T): T {
    const state = this.getCurrentStateSync();

    // 查找完全匹配的断点
    if (values[state.breakpoint] !== undefined) {
      return values[state.breakpoint];
    }

    // 查找小于等于当前断点的最大值
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === state.breakpoint);
    for (let i = currentIndex; i >= 0; i--) {
      const breakpointName = this.breakpoints[i].name;
      if (values[breakpointName] !== undefined) {
        return values[breakpointName];
      }
    }

    // 返回默认值
    return defaultValue || values.base || (Object.values(values)[0] as T);
  }

  // 获取网格列数
  getGridColumns(breakpointColumns: Record<string, number>): number {
    return this.getResponsiveValue(breakpointColumns, 1);
  }

  // 获取间距值
  getSpacing(spacingMap: Record<string, string>): string {
    return this.getResponsiveValue(spacingMap, 'gap-4');
  }

  // 检查是否为横向布局
  shouldUseHorizontalLayout(minBreakpoint: string = 'md'): boolean {
    const minIndex = this.breakpoints.findIndex(bp => bp.name === minBreakpoint);
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === this.getCurrentStateSync().breakpoint);
    return currentIndex >= minIndex;
  }

  // 获取卡片布局配置
  getCardLayout() {
    const state = this.getCurrentStateSync();
    return {
      columns: this.getGridColumns({
        xs: 1,
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4,
        '2xl': 4
      }),
      spacing: this.getSpacing({
        xs: 'gap-2',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-6',
        '2xl': 'gap-6'
      }),
      isCompact: state.isMobile
    };
  }

  // 获取表格布局配置
  getTableLayout() {
    const state = this.getCurrentStateSync();
    return {
      showCardView: state.isMobile,
      pageSize: state.isMobile ? 5 : state.isTablet ? 10 : 20,
      showPagination: !state.isMobile,
      showFilters: !state.isMobile
    };
  }

  // 获取图表高度
  getChartHeight(baseHeight: number = 300): number {
    const state = this.getCurrentStateSync();
    if (state.isMobile) {
      return Math.floor(baseHeight * 0.7);
    } else if (state.isTablet) {
      return Math.floor(baseHeight * 0.85);
    }
    return baseHeight;
  }
}