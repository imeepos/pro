import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Renderer2,
  inject
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ResponsiveService } from '../utils/responsive.utils';

// Flowbite 预设主题
export interface FlowbiteTheme {
  modal?: string;
  dropdown?: string;
  tooltip?: string;
  popover?: string;
  collapse?: string;
  tab?: string;
}

export interface FlowbiteConfig {
  theme?: FlowbiteTheme;
  responsive?: boolean;
  animations?: boolean;
}

@Directive({
  selector: '[flowbite]',
  standalone: true
})
export class FlowbiteDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private responsiveService = inject(ResponsiveService);

  private destroy$ = new Subject<void>();

  @Input() flowbiteType: string = '';
  @Input() flowbiteConfig: FlowbiteConfig = {};
  @Input() flowbiteTrigger: 'click' | 'hover' | 'focus' = 'click';
  @Input() flowbitePlacement: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @Input() flowbiteAnimation: boolean = true;
  @Input() flowbiteResponsive: boolean = true;

  private isInitialized = false;

  ngOnInit(): void {
    this.initializeFlowbite();
    this.setupResponsiveListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyFlowbite();
  }

  // 初始化 Flowbite
  private initializeFlowbite(): void {
    if (this.isInitialized) return;

    const element = this.elementRef.nativeElement;
    const type = this.flowbiteType || this.detectFlowbiteType();

    if (type) {
      this.applyFlowbiteClasses(element, type);
      this.setupFlowbiteInteractions(element, type);
      this.isInitialized = true;
    }
  }

  // 检测 Flowbite 类型
  private detectFlowbiteType(): string {
    const element = this.elementRef.nativeElement;
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';

    // 基于 class 检测
    if (className.includes('modal')) return 'modal';
    if (className.includes('dropdown')) return 'dropdown';
    if (className.includes('tooltip')) return 'tooltip';
    if (className.includes('popover')) return 'popover';
    if (className.includes('collapse')) return 'collapse';
    if (className.includes('tab')) return 'tab';

    // 基于 tag 检测
    switch (tagName) {
      case 'button':
        if (className.includes('dropdown-toggle')) return 'dropdown';
        break;
      case 'a':
        if (className.includes('dropdown-item')) return 'dropdown-item';
        break;
      default:
        break;
    }

    return '';
  }

  // 应用 Flowbite 类名
  private applyFlowbiteClasses(element: HTMLElement, type: string): void {
    const baseClasses = this.getBaseClasses(type);
    const responsiveClasses = this.getResponsiveClasses(type);
    const animationClasses = this.flowbiteAnimation ? this.getAnimationClasses(type) : '';

    this.renderer.addClass(element, ...baseClasses.split(' '));
    if (responsiveClasses) {
      this.renderer.addClass(element, ...responsiveClasses.split(' '));
    }
    if (animationClasses) {
      this.renderer.addClass(element, ...animationClasses.split(' '));
    }
  }

  // 获取基础类名
  private getBaseClasses(type: string): string {
    const classMap: Record<string, string> = {
      modal: 'fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50',
      dropdown: 'relative',
      tooltip: 'absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm',
      popover: 'absolute z-10 w-64 p-4 bg-white rounded-lg shadow-lg',
      collapse: 'overflow-hidden transition-all duration-300',
      tab: 'flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200'
    };

    return classMap[type] || '';
  }

  // 获取响应式类名
  private getResponsiveClasses(type: string): string {
    if (!this.flowbiteResponsive) return '';

    const state = this.responsiveService.getCurrentStateSync();

    const responsiveClassMap: Record<string, Record<string, string>> = {
      modal: {
        mobile: 'px-4 py-3',
        tablet: 'px-6 py-4',
        desktop: 'px-8 py-6'
      },
      dropdown: {
        mobile: 'w-full',
        tablet: 'w-64',
        desktop: 'w-80'
      },
      tooltip: {
        mobile: 'text-xs',
        desktop: 'text-sm'
      }
    };

    const typeMap = responsiveClassMap[type];
    if (!typeMap) return '';

    if (state.isMobile) return typeMap.mobile || '';
    if (state.isTablet) return typeMap.tablet || '';
    if (state.isDesktop) return typeMap.desktop || '';

    return '';
  }

  // 获取动画类名
  private getAnimationClasses(type: string): string {
    const animationMap: Record<string, string> = {
      modal: 'transition-opacity duration-300',
      dropdown: 'transition-all duration-200 transform',
      tooltip: 'transition-opacity duration-200',
      popover: 'transition-all duration-300 transform',
      collapse: 'transition-all duration-300',
      tab: ''
    };

    return animationMap[type] || '';
  }

  // 设置 Flowbite 交互
  private setupFlowbiteInteractions(element: HTMLElement, type: string): void {
    switch (type) {
      case 'dropdown':
        this.setupDropdown(element);
        break;
      case 'tooltip':
        this.setupTooltip(element);
        break;
      case 'collapse':
        this.setupCollapse(element);
        break;
      case 'tab':
        this.setupTabs(element);
        break;
      case 'modal':
        this.setupModal(element);
        break;
      default:
        break;
    }
  }

  // 设置下拉菜单
  private setupDropdown(element: HTMLElement): void {
    const trigger = element.querySelector('[data-dropdown-toggle]') as HTMLElement;
    const menu = element.querySelector('[data-dropdown-menu]') as HTMLElement;

    if (trigger && menu) {
      this.renderer.listen(trigger, 'click', (event: Event) => {
        event.preventDefault();
        this.toggleDropdown(menu);
      });

      // 点击外部关闭
      this.renderer.listen('document', 'click', (event: Event) => {
        if (!element.contains(event.target as Node)) {
          this.closeDropdown(menu);
        }
      });
    }
  }

  // 设置工具提示
  private setupTooltip(element: HTMLElement): void {
    const trigger = element.querySelector('[data-tooltip-trigger]') as HTMLElement;
    const tooltip = element.querySelector('[data-tooltip]') as HTMLElement;

    if (trigger && tooltip) {
      this.setupTooltipEvents(trigger, tooltip);
    }
  }

  // 设置折叠面板
  private setupCollapse(element: HTMLElement): void {
    const trigger = element.querySelector('[data-collapse-toggle]') as HTMLElement;
    const content = element.querySelector('[data-collapse-content]') as HTMLElement;

    if (trigger && content) {
      this.renderer.listen(trigger, 'click', (event: Event) => {
        event.preventDefault();
        this.toggleCollapse(content);
      });
    }
  }

  // 设置标签页
  private setupTabs(element: HTMLElement): void {
    const tabButtons = element.querySelectorAll('[data-tab-target]') as NodeListOf<HTMLElement>;
    const tabContents = element.querySelectorAll('[data-tab-content]') as NodeListOf<HTMLElement>;

    tabButtons.forEach((button, index) => {
      this.renderer.listen(button, 'click', (event: Event) => {
        event.preventDefault();
        this.switchTab(tabButtons, tabContents, index);
      });
    });
  }

  // 设置模态框
  private setupModal(element: HTMLElement): void {
    const trigger = element.querySelector('[data-modal-toggle]') as HTMLElement;
    const modal = element.querySelector('[data-modal]') as HTMLElement;
    const closeBtn = modal?.querySelector('[data-modal-close]') as HTMLElement;

    if (trigger && modal) {
      this.renderer.listen(trigger, 'click', (event: Event) => {
        event.preventDefault();
        this.showModal(modal);
      });
    }

    if (closeBtn) {
      this.renderer.listen(closeBtn, 'click', (event: Event) => {
        event.preventDefault();
        this.hideModal(modal);
      });
    }

    // 点击背景关闭
    this.renderer.listen(modal, 'click', (event: Event) => {
      if (event.target === modal) {
        this.hideModal(modal);
      }
    });
  }

  // 交互方法
  private toggleDropdown(menu: HTMLElement): void {
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      this.showDropdown(menu);
    } else {
      this.closeDropdown(menu);
    }
  }

  private showDropdown(menu: HTMLElement): void {
    this.renderer.removeClass(menu, 'hidden');
    this.renderer.addClass(menu, 'opacity-100', 'scale-100');
    this.renderer.removeClass(menu, 'opacity-0', 'scale-95');
  }

  private closeDropdown(menu: HTMLElement): void {
    this.renderer.addClass(menu, 'hidden');
    this.renderer.removeClass(menu, 'opacity-100', 'scale-100');
    this.renderer.addClass(menu, 'opacity-0', 'scale-95');
  }

  private setupTooltipEvents(trigger: HTMLElement, tooltip: HTMLElement): void {
    const showTooltip = () => this.showTooltip(tooltip);
    const hideTooltip = () => this.hideTooltip(tooltip);

    if (this.flowbiteTrigger === 'hover') {
      this.renderer.listen(trigger, 'mouseenter', showTooltip);
      this.renderer.listen(trigger, 'mouseleave', hideTooltip);
    } else if (this.flowbiteTrigger === 'focus') {
      this.renderer.listen(trigger, 'focus', showTooltip);
      this.renderer.listen(trigger, 'blur', hideTooltip);
    } else {
      this.renderer.listen(trigger, 'click', (event: Event) => {
        event.preventDefault();
        showTooltip();
        setTimeout(() => hideTooltip(), 2000);
      });
    }
  }

  private showTooltip(tooltip: HTMLElement): void {
    this.renderer.removeClass(tooltip, 'hidden', 'opacity-0');
    this.renderer.addClass(tooltip, 'opacity-100');
  }

  private hideTooltip(tooltip: HTMLElement): void {
    this.renderer.addClass(tooltip, 'hidden', 'opacity-0');
    this.renderer.removeClass(tooltip, 'opacity-100');
  }

  private toggleCollapse(content: HTMLElement): void {
    const isCollapsed = content.classList.contains('hidden');
    if (isCollapsed) {
      this.showCollapse(content);
    } else {
      this.hideCollapse(content);
    }
  }

  private showCollapse(content: HTMLElement): void {
    this.renderer.removeClass(content, 'hidden');
    setTimeout(() => {
      this.renderer.addClass(content, 'opacity-100');
      this.renderer.removeClass(content, 'opacity-0', 'max-h-0');
    }, 10);
  }

  private hideCollapse(content: HTMLElement): void {
    this.renderer.addClass(content, 'opacity-0', 'max-h-0');
    this.renderer.removeClass(content, 'opacity-100');
    setTimeout(() => {
      this.renderer.addClass(content, 'hidden');
    }, 300);
  }

  private switchTab(
    buttons: NodeListOf<HTMLElement>,
    contents: NodeListOf<HTMLElement>,
    activeIndex: number
  ): void {
    // 切换按钮状态
    buttons.forEach((button, index) => {
      if (index === activeIndex) {
        this.renderer.addClass(button, 'text-blue-600', 'border-blue-600');
        this.renderer.removeClass(button, 'text-gray-500', 'border-transparent');
      } else {
        this.renderer.removeClass(button, 'text-blue-600', 'border-blue-600');
        this.renderer.addClass(button, 'text-gray-500', 'border-transparent');
      }
    });

    // 切换内容显示
    contents.forEach((content, index) => {
      if (index === activeIndex) {
        this.renderer.removeClass(content, 'hidden');
      } else {
        this.renderer.addClass(content, 'hidden');
      }
    });
  }

  private showModal(modal: HTMLElement): void {
    this.renderer.removeClass(modal, 'hidden', 'opacity-0');
    this.renderer.addClass(modal, 'opacity-100');
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }

  private hideModal(modal: HTMLElement): void {
    this.renderer.addClass(modal, 'hidden', 'opacity-0');
    this.renderer.removeClass(modal, 'opacity-100');
    this.renderer.removeStyle(document.body, 'overflow');
  }

  // 设置响应式监听器
  private setupResponsiveListeners(): void {
    if (!this.flowbiteResponsive) return;

    this.responsiveService.responsive$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reinitializeForResponsive();
      });
  }

  // 响应式重新初始化
  private reinitializeForResponsive(): void {
    if (this.isInitialized) {
      this.destroyFlowbite();
      setTimeout(() => {
        this.initializeFlowbite();
      }, 0);
    }
  }

  // 销毁 Flowbite
  private destroyFlowbite(): void {
    const element = this.elementRef.nativeElement;

    // 移除事件监听器（Angular 会自动清理）
    this.renderer.setStyle(document.body, 'overflow', '');

    // 重置状态
    this.isInitialized = false;
  }
}