import React from 'react';
import {
  BarChart3,
  Eye,
} from 'lucide-react';
import NavigationMenu from './ui/NavigationMenu';
import { RealTimeIndicator, AlertStatus } from './ui';
import { useAppStore } from '@/stores/useAppStore';
import { formatNumber, cn } from '@/utils';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { realTimeData, isConnected } = useAppStore();

  if (!realTimeData) {
    return (
      <aside className={cn('glass-card border-r p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </aside>
    );
  }

  const { statistics } = realTimeData;

  return (
    <aside className={cn(
      'glass-card border-r flex flex-col overflow-y-auto scrollbar-hide',
      className
    )}>
      {/* 导航菜单 */}
      <div className="p-6 border-b">
        <NavigationMenu />
      </div>

      {/* 舆情态势总览 */}
      <div className="p-6 space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            舆情态势实时感知
          </h2>
          <RealTimeIndicator
            isConnected={isConnected}
            lastUpdate={new Date()}
            updateInterval={30000}
            showLabel={false}
            compact={true}
          />
        </div>

        {/* 舆情状态 */}
        <div className="space-y-3">
          <AlertStatus
            level="normal"
            message="舆情态势平稳"
            count={statistics?.total || 0}
            timestamp={new Date()}
            compact={true}
          />
        </div>

        {/* 今日数据统计 */}
        <div className="data-summary-card bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              今日数据
            </span>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">总量</span>
              <span className="text-sm font-bold text-foreground font-mono">
                {formatNumber(statistics?.total || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">增长</span>
              <span className={cn(
                'text-sm font-bold font-mono',
                (statistics?.growthRate || 0) >= 0 ? 'text-sentiment-positive' : 'text-sentiment-negative'
              )}>
                {(statistics?.growthRate || 0) >= 0 ? '+' : ''}{((statistics?.growthRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 情感分布 */}
        <div className="data-summary-card bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
            <div className="w-2 h-2 bg-gradient-to-r from-sentiment-positive via-sentiment-neutral to-sentiment-negative rounded-full mr-2"></div>
            情感分布
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-sentiment-positive flex items-center">
                <div className="w-1.5 h-1.5 bg-sentiment-positive rounded-full mr-1.5"></div>
                正面
              </span>
              <span className="text-sm font-bold text-sentiment-positive font-mono">
                {statistics?.total ? Math.round(((statistics.positive || 0) / statistics.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-sentiment-negative flex items-center">
                <div className="w-1.5 h-1.5 bg-sentiment-negative rounded-full mr-1.5"></div>
                负面
              </span>
              <span className="text-sm font-bold text-sentiment-negative font-mono">
                {statistics?.total ? Math.round(((statistics.negative || 0) / statistics.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-sentiment-neutral flex items-center">
                <div className="w-1.5 h-1.5 bg-sentiment-neutral rounded-full mr-1.5"></div>
                中性
              </span>
              <span className="text-sm font-bold text-sentiment-neutral font-mono">
                {statistics?.total ? Math.round((((statistics.total || 0) - (statistics.positive || 0) - (statistics.negative || 0)) / statistics.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
