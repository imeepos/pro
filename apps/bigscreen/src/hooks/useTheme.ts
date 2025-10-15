import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

/**
 * 主题管理Hook
 * 提供主题切换功能和本地存储持久化
 */
export const useTheme = () => {
  const { dashboardConfig, setDashboardConfig } = useAppStore();

  // 初始化主题，从本地存储读取
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') as 'light' | 'dark' | null;
    if (savedTheme && savedTheme !== dashboardConfig.theme) {
      setDashboardConfig({ theme: savedTheme });
    }
  }, []);

  // 监听主题变化，保存到本地存储
  useEffect(() => {
    localStorage.setItem('dashboard-theme', dashboardConfig.theme);
    
    // 更新document的class以支持CSS主题切换
    const root = document.documentElement;
    if (dashboardConfig.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dashboardConfig.theme]);

  // 切换主题
  const toggleTheme = () => {
    const newTheme = dashboardConfig.theme === 'dark' ? 'light' : 'dark';
    setDashboardConfig({ theme: newTheme });
  };

  // 设置特定主题
  const setTheme = (theme: 'light' | 'dark') => {
    setDashboardConfig({ theme });
  };

  return {
    theme: dashboardConfig.theme,
    toggleTheme,
    setTheme,
    isDark: dashboardConfig.theme === 'dark',
    isLight: dashboardConfig.theme === 'light',
  };
};
