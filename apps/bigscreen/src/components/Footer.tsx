import React from 'react';
import { Server, Database, Zap, Users, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { formatNumber, formatRelativeTime, cn } from '@/utils';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const { systemStatus, realTimeData, isConnected, dashboardConfig } = useAppStore();
  const [autoRefreshCountdown, setAutoRefreshCountdown] = React.useState(0);

  // 自动刷新倒计时
  React.useEffect(() => {
    if (!dashboardConfig.autoRefresh) return;

    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 0) {
          return Math.floor(dashboardConfig.refreshInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dashboardConfig.autoRefresh, dashboardConfig.refreshInterval]);

  // 初始化倒计时
  React.useEffect(() => {
    if (dashboardConfig.autoRefresh) {
      setAutoRefreshCountdown(Math.floor(dashboardConfig.refreshInterval / 1000));
    }
  }, [dashboardConfig.autoRefresh, dashboardConfig.refreshInterval]);

  return (
    <footer className={cn(
      'glass-card border-t border-border px-6 py-3 flex items-center justify-between text-sm',
      className
    )}>
      {/* 左侧：系统状态 */}
      <div className="flex items-center space-x-6">
        {/* 服务器状态 */}
        <div className="flex items-center space-x-2">
          <Server className={cn(
            'w-4 h-4',
            systemStatus.isOnline ? 'text-green-400' : 'text-red-400'
          )} />
          <span className={cn(
            'text-xs',
            systemStatus.isOnline ? 'text-green-400' : 'text-red-400'
          )}>
            服务器 {systemStatus.isOnline ? '在线' : '离线'}
          </span>
        </div>

        {/* 数据库状态 */}
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-muted-foreground">
            数据库连接正常
          </span>
        </div>

        {/* 性能指标 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              延迟: <span className="text-foreground font-mono">12ms</span>
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-muted-foreground">
              在线用户: <span className="text-foreground font-mono">1</span>
            </span>
          </div>
        </div>
      </div>

      {/* 中间：数据统计 */}
      <div className="flex items-center space-x-6">
        {realTimeData && (
          <>
            <div className="text-xs text-muted-foreground">
              总数据: <span className="text-foreground font-mono">
                {formatNumber(realTimeData.statistics.total)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              热点话题: <span className="text-foreground font-mono">
                {realTimeData.hotTopics.length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              关键词: <span className="text-foreground font-mono">
                {realTimeData.keywords.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 右侧：刷新状态和版本信息 */}
      <div className="flex items-center space-x-6">
        {/* 自动刷新状态 */}
        {dashboardConfig.autoRefresh && (
          <div className="flex items-center space-x-2">
            <RefreshCw className={cn(
              'w-3 h-3',
              autoRefreshCountdown <= 5 ? 'text-yellow-400 animate-spin' : 'text-muted-foreground'
            )} />
            <span className="text-xs text-muted-foreground">
              自动刷新: <span className="text-foreground font-mono">
                {autoRefreshCountdown}s
              </span>
            </span>
          </div>
        )}

        {/* 最后更新时间 */}
        <div className="text-xs text-muted-foreground">
          更新时间: <span className="text-foreground">
            {formatRelativeTime(systemStatus.lastUpdate)}
          </span>
        </div>

        {/* 版本信息 */}
        <div className="text-xs text-muted-foreground/70">
          v1.0.0
        </div>

        {/* 状态指示器 */}
        <div className="flex items-center space-x-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            systemStatus.isOnline && isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          )}></div>
          <span className="text-xs text-muted-foreground">
            {systemStatus.isOnline && isConnected ? '运行中' : '异常'}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
