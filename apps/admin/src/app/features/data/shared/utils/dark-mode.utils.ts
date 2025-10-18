import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  defaultTheme?: Theme;
  respectSystemPreference?: boolean;
  storageKey?: string;
  transitionDuration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  private defaultConfig: ThemeConfig = {
    defaultTheme: 'auto',
    respectSystemPreference: true,
    storageKey: 'theme',
    transitionDuration: 200
  };

  private config: ThemeConfig;
  private mediaQuery: MediaQueryList;
  private themeSubject = new BehaviorSubject<Theme>('auto');

  // 主题状态流
  theme$ = this.themeSubject.asObservable();
  isDarkMode$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.config = { ...this.defaultConfig };
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  // 初始化主题
  private initializeTheme(): void {
    // 从本地存储读取设置
    const storedTheme = this.getStoredTheme();
    const theme = storedTheme || this.config.defaultTheme || 'auto';

    this.setTheme(theme);
  }

  // 设置主题
  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    this.saveTheme(theme);
    this.applyTheme(theme);
  }

  // 应用主题
  private applyTheme(theme: Theme): void {
    const isDark = this.getEffectiveTheme(theme) === 'dark';
    this.isDarkMode$.next(isDark);

    // 应用到 HTML 元素
    const html = document.documentElement;

    if (isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }

    // 添加过渡动画
    if (this.config.transitionDuration) {
      html.style.transition = `background-color ${this.config.transitionDuration}ms ease-in-out`;

      setTimeout(() => {
        html.style.transition = '';
      }, this.config.transitionDuration);
    }
  }

  // 获取有效主题
  private getEffectiveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'auto' && this.config.respectSystemPreference) {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  }

  // 切换主题
  toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  // 系统主题监听
  private setupSystemThemeListener(): void {
    if (this.config.respectSystemPreference) {
      this.mediaQuery.addEventListener('change', (event) => {
        if (this.themeSubject.value === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  // 存储主题设置
  private saveTheme(theme: Theme): void {
    try {
      localStorage.setItem(this.config.storageKey!, theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }

  // 获取存储的主题
  private getStoredTheme(): Theme | null {
    try {
      const stored = localStorage.getItem(this.config.storageKey!);
      return stored as Theme || null;
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
      return null;
    }
  }

  // 获取当前主题
  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  // 获取当前是否为深色模式
  isDarkMode(): boolean {
    return this.isDarkMode$.value;
  }

  // 检查主题支持情况
  isSupported(): boolean {
    return (
      'localStorage' in window &&
      'matchMedia' in window &&
      window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all'
    );
  }

  // 重置为默认主题
  resetToDefault(): void {
    this.setTheme(this.config.defaultTheme!);
  }

  // 获取系统主题偏好
  getSystemPreference(): 'light' | 'dark' {
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  // 监听主题变化
  onThemeChange(): Observable<Theme> {
    return this.theme$.pipe(distinctUntilChanged());
  }

  // 监听深色模式变化
  onDarkModeChange(): Observable<boolean> {
    return this.isDarkMode$.asObservable().pipe(distinctUntilChanged());
  }

  // 配置更新
  updateConfig(newConfig: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeTheme();
  }

  // 获取主题相关的 CSS 变量
  getThemeVariables(): Record<string, string> {
    const isDark = this.isDarkMode();

    return {
      '--bg-primary': isDark ? '#1f2937' : '#ffffff',
      '--bg-secondary': isDark ? '#374151' : '#f9fafb',
      '--bg-tertiary': isDark ? '#4b5563' : '#f3f4f6',
      '--text-primary': isDark ? '#f9fafb' : '#111827',
      '--text-secondary': isDark ? '#d1d5db' : '#4b5563',
      '--text-tertiary': isDark ? '#9ca3af' : '#6b7280',
      '--border-primary': isDark ? '#374151' : '#e5e7eb',
      '--border-secondary': isDark ? '#4b5563' : '#d1d5db',
      '--accent-primary': isDark ? '#3b82f6' : '#2563eb',
      '--accent-secondary': isDark ? '#1d4ed8' : '#1d4ed8',
      '--shadow-primary': isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      '--shadow-secondary': isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)'
    };
  }

  // 应用主题 CSS 变量
  applyThemeVariables(): void {
    const root = document.documentElement;
    const variables = this.getThemeVariables();

    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  // 获取 Flowbite 主题类名
  getFlowbiteThemeClasses(): Record<string, string> {
    const isDark = this.isDarkMode();

    return {
      bg: isDark ? 'bg-gray-800' : 'bg-white',
      bgSecondary: isDark ? 'bg-gray-700' : 'bg-gray-50',
      bgTertiary: isDark ? 'bg-gray-600' : 'bg-gray-100',
      text: isDark ? 'text-white' : 'text-gray-900',
      textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
      textTertiary: isDark ? 'text-gray-400' : 'text-gray-500',
      border: isDark ? 'border-gray-600' : 'border-gray-300',
      borderSecondary: isDark ? 'border-gray-500' : 'border-gray-200',
      hover: isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-50',
      focus: isDark ? 'focus:border-blue-400 focus:ring-blue-400' : 'focus:border-blue-500 focus:ring-blue-500'
    };
  }

  // 销毁服务
  destroy(): void {
    this.mediaQuery.removeEventListener('change', () => {});
    this.themeSubject.complete();
    this.isDarkMode$.complete();
  }
}