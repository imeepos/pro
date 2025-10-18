import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponsiveService, ResponsiveState } from '../utils/responsive.utils';

// 响应式混入接口
export interface ResponsiveMixin {
  responsive$: Observable<ResponsiveState>;
  isMobile$: Observable<boolean>;
  isTablet$: Observable<boolean>;
  isDesktop$: Observable<boolean>;
  getCurrentResponsiveState(): ResponsiveState;
  getResponsiveValue<T>(values: Record<string, T>, defaultValue?: T): T;
  shouldUseMobileLayout(): boolean;
  shouldUseCompactLayout(): boolean;
}

// 响应式混入实现
export function withResponsiveMixin(): ResponsiveMixin {
  const responsiveService = inject(ResponsiveService);

  return {
    responsive$: responsiveService.responsive$,
    isMobile$: responsiveService.isMobile$,
    isTablet$: responsiveService.isTablet$,
    isDesktop$: responsiveService.isDesktop$,

    getCurrentResponsiveState(): ResponsiveState {
      return responsiveService.getCurrentStateSync();
    },

    getResponsiveValue<T>(values: Record<string, T>, defaultValue?: T): T {
      return responsiveService.getResponsiveValue(values, defaultValue);
    },

    shouldUseMobileLayout(): boolean {
      return responsiveService.getCurrentStateSync().isMobile;
    },

    shouldUseCompactLayout(): boolean {
      const state = responsiveService.getCurrentStateSync();
      return state.isMobile || state.screenWidth < 768;
    }
  };
}

// 响应式布局混入
export interface ResponsiveLayoutMixin extends ResponsiveMixin {
  getLayoutColumns(breakpointColumns: Record<string, number>): number;
  getLayoutSpacing(spacingMap: Record<string, string>): string;
  getChartHeight(baseHeight?: number): number;
  getTableLayoutConfig(): {
    showCardView: boolean;
    pageSize: number;
    showPagination: boolean;
    showFilters: boolean;
  };
  getCardLayoutConfig(): {
    columns: number;
    spacing: string;
    isCompact: boolean;
  };
}

// 响应式布局混入实现
export function withResponsiveLayoutMixin(): ResponsiveLayoutMixin {
  const baseMixin = withResponsiveMixin();
  const responsiveService = inject(ResponsiveService);

  return {
    ...baseMixin,

    getLayoutColumns(breakpointColumns: Record<string, number>): number {
      return responsiveService.getGridColumns(breakpointColumns);
    },

    getLayoutSpacing(spacingMap: Record<string, string>): string {
      return responsiveService.getSpacing(spacingMap);
    },

    getChartHeight(baseHeight: number = 300): number {
      return responsiveService.getChartHeight(baseHeight);
    },

    getTableLayoutConfig() {
      return responsiveService.getTableLayout();
    },

    getCardLayoutConfig() {
      return responsiveService.getCardLayout();
    }
  };
}