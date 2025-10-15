import React from 'react';
import { Clock, Activity, Settings, Maximize, Minimize, Sun, Moon, User, Layout, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useLayoutStore } from '@/stores/useLayoutStore';
import { useTheme } from '@/hooks/useTheme';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFullscreenShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatTime, cn } from '@/utils';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const {
    systemStatus,
    selectedTimeRange,
    setSelectedTimeRange
  } = useAppStore();
  const { 
    currentLayout, 
    savedLayouts, 
    setCurrentLayout, 
    isEditMode, 
    toggleEditMode 
  } = useLayoutStore();
  const { toggleTheme, isDark } = useTheme();
  const { isFullscreen, isSupported, toggleFullscreen, exitFullscreen } = useFullscreen();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = React.useState(false);

  // 注册全屏快捷键
  useFullscreenShortcuts(toggleFullscreen, exitFullscreen);

  // 更新当前时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 点击外部关闭布局菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLayoutMenuOpen && !(event.target as Element).closest('.layout-menu')) {
        setIsLayoutMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayoutMenuOpen]);

  // 时间区间选项 - 根据您的需求更新
  const timeRangeOptions = [
    { value: 'today', label: '今日' },
    { value: 'yesterday', label: '昨日' },
    { value: 'thisWeek', label: '本周' },
    { value: 'lastWeek', label: '上周' },
    { value: 'thisMonth', label: '本月' },
    { value: 'lastMonth', label: '上月' },
    { value: 'thisQuarter', label: '本季度' },
    { value: 'lastQuarter', label: '上季度' },
    { value: 'halfYear', label: '半年' },
    { value: 'lastHalfYear', label: '上半年' },
    { value: 'thisYear', label: '今年' },
    { value: 'lastYear', label: '去年' },
    { value: 'all', label: '所有' },
  ] as const;

  // 主题切换函数已在useTheme hook中提供

  return (
    <header className={cn(
      'glass-card px-6 py-2 flex items-center justify-between border-b',
      className
    )}>
      {/* 左侧：标题和状态 */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">舆情监控大屏幕</h1>
            <p className="text-sm text-muted-foreground">实时数据分析与展示</p>
          </div>
        </div>

        {/* 数据源状态 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              systemStatus.dataSource?.weibo ? 'bg-green-400' : 'bg-red-400'
            )}></div>
            <span className="text-xs text-gray-400">微博</span>
          </div>
        </div>
      </div>

      {/* 中间：时间范围选择 */}
      <div className="flex items-center space-x-3">
        <span className="text-sm text-muted-foreground">时间区间:</span>
        <div className="relative">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className={cn(
              'bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'hover:bg-accent transition-colors cursor-pointer'
            )}
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-card text-foreground">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 右侧：顶部右侧菜单 */}
      <div className="flex items-center space-x-4">
        {/* 当前时间 */}
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div className="text-right">
            <div className="text-sm font-mono text-foreground">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              最后更新: {formatTime(systemStatus.lastUpdate)}
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-600"></div>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors group"
          title={isDark ? '切换到亮色主题' : '切换到暗黑主题'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
          )}
        </button>

        {/* 布局设置 */}
        <div className="relative layout-menu">
          <button
            onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors group"
            title="布局设置"
          >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          
          {/* 布局选择下拉菜单 */}
          {isLayoutMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-4">
                <h3 className="font-medium text-foreground mb-3">选择布局</h3>
                <div className="space-y-2">
                  {savedLayouts.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => {
                        setCurrentLayout(layout);
                        setIsLayoutMenuOpen(false);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-lg transition-colors',
                        currentLayout?.id === layout.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{layout.name}</div>
                          {layout.description && (
                            <div className="text-sm opacity-70">{layout.description}</div>
                          )}
                        </div>
                        <Layout className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="border-t mt-3 pt-3">
                  <button
                    onClick={() => {
                      toggleEditMode();
                      setIsLayoutMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{isEditMode ? '退出编辑' : '编辑布局'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 当前用户 */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg hover:bg-accent transition-colors cursor-pointer">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">管理员</span>
        </div>

        {/* 全屏按钮 */}
        {isSupported && (
          <button
            onClick={() => toggleFullscreen()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            ) : (
              <Maximize className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
