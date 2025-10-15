import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { 
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  Target,
  MessageSquare,
  Users
} from 'lucide-react';

interface TimelineEvent {
  time: string;
  event: string;
  type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone' | 'crisis';
  impact: number;
  description?: string;
  metrics?: {
    posts?: number;
    users?: number;
    sentiment?: number;
  };
}

interface EventTimelineChartProps {
  data: TimelineEvent[];
  className?: string;
}

const EventTimelineChart: React.FC<EventTimelineChartProps> = ({ 
  data, 
  className = '' 
}) => {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start':
        return <Activity className="w-4 h-4" />;
      case 'peak':
        return <TrendingUp className="w-4 h-4" />;
      case 'decline':
        return <TrendingUp className="w-4 h-4 rotate-180" />;
      case 'key_event':
        return <Zap className="w-4 h-4" />;
      case 'milestone':
        return <CheckCircle className="w-4 h-4" />;
      case 'crisis':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start':
        return 'border-green-400 bg-green-400 text-green-400';
      case 'peak':
        return 'border-red-400 bg-red-400 text-red-400';
      case 'decline':
        return 'border-yellow-400 bg-yellow-400 text-yellow-400';
      case 'key_event':
        return 'border-blue-400 bg-blue-400 text-blue-400';
      case 'milestone':
        return 'border-purple-400 bg-purple-400 text-purple-400';
      case 'crisis':
        return 'border-orange-400 bg-orange-400 text-orange-400';
      default:
        return 'border-gray-400 bg-gray-400 text-gray-400';
    }
  };

  const getImpactLevel = (impact: number) => {
    if (impact >= 80) return { level: '高', color: 'text-red-400' };
    if (impact >= 60) return { level: '中', color: 'text-yellow-400' };
    return { level: '低', color: 'text-green-400' };
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 时间线图表 */}
      <div className="relative">
        {/* 主时间线 */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-primary/20 rounded-full"></div>
        
        <div className="space-y-8">
          {data.map((item, index) => {
            const impactInfo = getImpactLevel(item.impact);
            const colorClasses = getEventColor(item.type);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="relative flex items-start space-x-6"
              >
                {/* 时间节点 */}
                <div className="relative z-10">
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-white',
                    colorClasses.split(' ')[0], // border color
                    colorClasses.split(' ')[1]  // bg color
                  )}>
                    {getEventIcon(item.type)}
                  </div>
                  
                  {/* 影响力指示器 */}
                  <div className="absolute -right-2 -top-2 w-4 h-4 bg-card border border-border rounded-full flex items-center justify-center">
                    <span className={cn('text-xs font-bold', impactInfo.color)}>
                      {item.impact}
                    </span>
                  </div>
                </div>

                {/* 事件内容 */}
                <div className="flex-1 bg-card/50 border border-border/50 rounded-lg p-6 hover:bg-card/70 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {item.time}
                        </span>
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full',
                          impactInfo.color.replace('text-', 'bg-').replace('-400', '-500/20'),
                          impactInfo.color
                        )}>
                          {impactInfo.level}影响
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">{item.event}</h4>
                      {item.description && (
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{item.impact}</div>
                      <div className="text-xs text-muted-foreground">影响力</div>
                    </div>
                  </div>

                  {/* 指标数据 */}
                  {item.metrics && (
                    <div className="flex items-center space-x-6 pt-3 border-t border-border/30">
                      {item.metrics.posts && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{item.metrics.posts.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">贴子</span>
                        </div>
                      )}
                      {item.metrics.users && (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{item.metrics.users.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">用户</span>
                        </div>
                      )}
                      {item.metrics.sentiment !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{(item.metrics.sentiment * 100).toFixed(1)}%</span>
                          <span className="text-xs text-muted-foreground">正面情感</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 时间线统计摘要 */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          时间线统计
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-foreground mb-1">{data.length}</div>
            <div className="text-sm text-muted-foreground">关键节点</div>
          </div>
          
          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-red-400 mb-1">
              {data.filter(d => d.impact >= 80).length}
            </div>
            <div className="text-sm text-muted-foreground">高影响事件</div>
          </div>
          
          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-blue-400 mb-1">
              {Math.max(...data.map(d => d.impact))}
            </div>
            <div className="text-sm text-muted-foreground">峰值影响力</div>
          </div>
          
          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-purple-400 mb-1">
              {Math.round(data.reduce((sum, d) => sum + d.impact, 0) / data.length)}
            </div>
            <div className="text-sm text-muted-foreground">平均影响力</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTimelineChart;
