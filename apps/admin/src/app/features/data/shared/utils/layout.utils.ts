import { Injectable, inject } from '@angular/core';
import { ResponsiveService } from './responsive.utils';
import { DarkModeService } from './dark-mode.utils';

export interface LayoutConfig {
  container?: {
    padding?: string;
    maxWidth?: string;
    center?: boolean;
  };
  grid?: {
    columns?: Record<string, number>;
    gap?: Record<string, string>;
    responsive?: boolean;
  };
  card?: {
    padding?: string;
    borderRadius?: string;
    shadow?: boolean;
    border?: boolean;
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
}

export interface BreakpointValues {
  xs?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
  '2xl'?: any;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutUtils {
  private responsiveService = inject(ResponsiveService);
  private darkModeService = inject(DarkModeService);

  private defaultConfig: LayoutConfig = {
    container: {
      padding: 'p-4 md:p-6 lg:p-8',
      maxWidth: 'max-w-7xl',
      center: true
    },
    grid: {
      columns: {
        xs: 1,
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4,
        '2xl': 4
      },
      gap: {
        xs: 'gap-2',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-6',
        '2xl': 'gap-6'
      },
      responsive: true
    },
    card: {
      padding: 'p-4 md:p-6',
      borderRadius: 'rounded-lg',
      shadow: true,
      border: true
    },
    spacing: {
      xs: 'space-y-2',
      sm: 'space-y-3',
      md: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8'
    }
  };

  // 获取容器类名
  getContainerClasses(config?: Partial<LayoutConfig['container']>): string {
    const state = this.responsiveService.getCurrentStateSync();
    const finalConfig = { ...this.defaultConfig.container, ...config };

    const classes: string[] = [];

    // 最大宽度
    if (finalConfig.maxWidth) {
      classes.push(finalConfig.maxWidth);
    }

    // 居中
    if (finalConfig.center) {
      classes.push('mx-auto');
    }

    // 内边距
    if (finalConfig.padding) {
      classes.push(finalConfig.padding);
    }

    return classes.join(' ');
  }

  // 获取网格类名
  getGridClasses(config?: Partial<LayoutConfig['grid']>): string {
    const state = this.responsiveService.getCurrentStateSync();
    const finalConfig = { ...this.defaultConfig.grid, ...config };

    const classes: string[] = ['grid'];

    // 响应式列数
    if (finalConfig.responsive && finalConfig.columns) {
      const columns = this.responsiveService.getResponsiveValue(finalConfig.columns, 1);
      classes.push(`grid-cols-${columns}`);
    }

    // 间距
    if (finalConfig.gap) {
      const gap = this.responsiveService.getResponsiveValue(finalConfig.gap, 'gap-4');
      classes.push(gap);
    }

    return classes.join(' ');
  }

  // 获取卡片类名
  getCardClasses(config?: Partial<LayoutConfig['card']>, darkMode?: boolean): string {
    const isDark = darkMode ?? this.darkModeService.isDarkMode();
    const finalConfig = { ...this.defaultConfig.card, ...config };

    const classes: string[] = [];

    // 背景色
    classes.push(isDark ? 'bg-gray-800' : 'bg-white');

    // 内边距
    if (finalConfig.padding) {
      classes.push(finalConfig.padding);
    }

    // 圆角
    if (finalConfig.borderRadius) {
      classes.push(finalConfig.borderRadius);
    }

    // 阴影
    if (finalConfig.shadow) {
      classes.push(isDark ? 'shadow-lg shadow-gray-900/20' : 'shadow-sm');
    }

    // 边框
    if (finalConfig.border) {
      classes.push(isDark ? 'border border-gray-700' : 'border border-gray-200');
    }

    return classes.join(' ');
  }

  // 获取间距类名
  getSpacingClasses(type: 'y' | 'x' | 'all' = 'y', size?: string): string {
    const state = this.responsiveService.getCurrentStateSync();
    const sizeMap = this.defaultConfig.spacing!;

    if (size && sizeMap[size as keyof typeof sizeMap]) {
      return sizeMap[size as keyof typeof sizeMap];
    }

    // 默认基于屏幕大小
    let spacing = 'space-y-4';
    if (state.isMobile) spacing = 'space-y-2';
    if (state.isTablet) spacing = 'space-y-3';
    if (state.isDesktop) spacing = 'space-y-6';

    return spacing;
  }

  // 获取文本对齐类名
  getTextAlignClasses(align: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const value = this.responsiveService.getResponsiveValue(align, 'left');

    const alignMap: Record<string, string> = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify'
    };

    return alignMap[value] || 'text-left';
  }

  // 获取显示类名
  getDisplayClasses(display: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const value = this.responsiveService.getResponsiveValue(display, 'block');

    const displayMap: Record<string, string> = {
      block: 'block',
      inline: 'inline',
      'inline-block': 'inline-block',
      flex: 'flex',
      'inline-flex': 'inline-flex',
      grid: 'grid',
      'inline-grid': 'inline-grid',
      hidden: 'hidden',
      none: 'none'
    };

    return displayMap[value] || 'block';
  }

  // 获取布局方向类名
  getFlexDirectionClasses(direction: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const value = this.responsiveService.getResponsiveValue(direction, 'row');

    const directionMap: Record<string, string> = {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      column: 'flex-col',
      'col-reverse': 'flex-col-reverse'
    };

    return directionMap[value] || 'flex-row';
  }

  // 获取对齐类名
  getAlignmentClasses(align: {
    items?: BreakpointValues;
    justify?: BreakpointValues;
    content?: BreakpointValues;
  }): string {
    const state = this.responsiveService.getCurrentStateSync();
    const classes: string[] = [];

    // align-items
    if (align.items) {
      const value = this.responsiveService.getResponsiveValue(align.items, 'stretch');
      const alignMap: Record<string, string> = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline'
      };
      classes.push(alignMap[value] || 'items-stretch');
    }

    // justify-content
    if (align.justify) {
      const value = this.responsiveService.getResponsiveValue(align.justify, 'start');
      const justifyMap: Record<string, string> = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly'
      };
      classes.push(justifyMap[value] || 'justify-start');
    }

    // align-content
    if (align.content) {
      const value = this.responsiveService.getResponsiveValue(align.content, 'stretch');
      const contentMap: Record<string, string> = {
        start: 'content-start',
        center: 'content-center',
        end: 'content-end',
        between: 'content-between',
        around: 'content-around',
        evenly: 'content-evenly',
        stretch: 'content-stretch'
      };
      classes.push(contentMap[value] || 'content-stretch');
    }

    return classes.join(' ');
  }

  // 获取响应式边距类名
  getMarginClasses(margin: {
    all?: BreakpointValues;
    top?: BreakpointValues;
    right?: BreakpointValues;
    bottom?: BreakpointValues;
    left?: BreakpointValues;
    x?: BreakpointValues;
    y?: BreakpointValues;
  }): string {
    const state = this.responsiveService.getCurrentStateSync();
    const classes: string[] = [];

    const getMarginValue = (value: any): string => {
      const numericValue = this.responsiveService.getResponsiveValue(value, 0);
      if (numericValue === 0) return '0';
      if (numericValue === 1) return '1';
      if (numericValue === 2) return '2';
      if (numericValue === 3) return '3';
      if (numericValue === 4) return '4';
      if (numericValue === 5) return '5';
      if (numericValue === 6) return '6';
      if (numericValue === 8) return '8';
      if (numericValue === 10) return '10';
      if (numericValue === 12) return '12';
      if (numericValue === 16) return '16';
      if (numericValue === 20) return '20';
      if (numericValue === 24) return '24';
      return '4';
    };

    Object.entries(margin).forEach(([position, value]) => {
      if (value !== undefined) {
        const marginValue = getMarginValue(value);
        switch (position) {
          case 'all':
            classes.push(`m-${marginValue}`);
            break;
          case 'top':
            classes.push(`mt-${marginValue}`);
            break;
          case 'right':
            classes.push(`mr-${marginValue}`);
            break;
          case 'bottom':
            classes.push(`mb-${marginValue}`);
            break;
          case 'left':
            classes.push(`ml-${marginValue}`);
            break;
          case 'x':
            classes.push(`mx-${marginValue}`);
            break;
          case 'y':
            classes.push(`my-${marginValue}`);
            break;
        }
      }
    });

    return classes.join(' ');
  }

  // 获取响应式内边距类名
  getPaddingClasses(padding: {
    all?: BreakpointValues;
    top?: BreakpointValues;
    right?: BreakpointValues;
    bottom?: BreakpointValues;
    left?: BreakpointValues;
    x?: BreakpointValues;
    y?: BreakpointValues;
  }): string {
    const state = this.responsiveService.getCurrentStateSync();
    const classes: string[] = [];

    const getPaddingValue = (value: any): string => {
      const numericValue = this.responsiveService.getResponsiveValue(value, 4);
      if (numericValue === 0) return '0';
      if (numericValue === 1) return '1';
      if (numericValue === 2) return '2';
      if (numericValue === 3) return '3';
      if (numericValue === 4) return '4';
      if (numericValue === 5) return '5';
      if (numericValue === 6) return '6';
      if (numericValue === 8) return '8';
      if (numericValue === 10) return '10';
      if (numericValue === 12) return '12';
      if (numericValue === 16) return '16';
      if (numericValue === 20) return '20';
      if (numericValue === 24) return '24';
      return '4';
    };

    Object.entries(padding).forEach(([position, value]) => {
      if (value !== undefined) {
        const paddingValue = getPaddingValue(value);
        switch (position) {
          case 'all':
            classes.push(`p-${paddingValue}`);
            break;
          case 'top':
            classes.push(`pt-${paddingValue}`);
            break;
          case 'right':
            classes.push(`pr-${paddingValue}`);
            break;
          case 'bottom':
            classes.push(`pb-${paddingValue}`);
            break;
          case 'left':
            classes.push(`pl-${paddingValue}`);
            break;
          case 'x':
            classes.push(`px-${paddingValue}`);
            break;
          case 'y':
            classes.push(`py-${paddingValue}`);
            break;
        }
      }
    });

    return classes.join(' ');
  }

  // 获取响应式宽度类名
  getWidthClasses(width: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const value = this.responsiveService.getResponsiveValue(width, 'auto');

    if (value === 'auto') return 'w-auto';
    if (value === 'full') return 'w-full';
    if (value === 'screen') return 'w-screen';
    if (value === 'min') return 'w-min';
    if (value === 'max') return 'w-max';
    if (value === 'fit') return 'w-fit';

    // 数字值
    const numericWidth = parseInt(value.toString());
    if (!isNaN(numericWidth)) {
      return `w-${numericWidth}/12`;
    }

    return 'w-auto';
  }

  // 获取响应式高度类名
  getHeightClasses(height: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const value = this.responsiveService.getResponsiveValue(height, 'auto');

    if (value === 'auto') return 'h-auto';
    if (value === 'full') return 'h-full';
    if (value === 'screen') return 'h-screen';
    if (value === 'min') return 'h-min';
    if (value === 'max') return 'h-max';
    if (value === 'fit') return 'h-fit';

    // 数字值
    const numericHeight = parseInt(value.toString());
    if (!isNaN(numericHeight)) {
      if (numericHeight <= 96) {
        return `h-${numericHeight}`;
      }
      // 大于96的高度需要特殊处理
      return `h-[${numericHeight}px]`;
    }

    return 'h-auto';
  }

  // 生成响应式类名
  generateResponsiveClasses(baseClass: string, modifiers: BreakpointValues): string {
    const state = this.responsiveService.getCurrentStateSync();
    const classes: string[] = [baseClass];

    Object.entries(modifiers).forEach(([breakpoint, value]) => {
      if (value !== undefined && value !== null) {
        if (breakpoint === 'base') {
          classes.push(`${baseClass}-${value}`);
        } else if (state.breakpoint === breakpoint) {
          classes.push(`${baseClass}-${value}`);
        }
      }
    });

    return classes.join(' ');
  }
}