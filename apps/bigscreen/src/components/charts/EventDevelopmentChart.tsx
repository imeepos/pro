import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { 
  TrendingUp,
  CheckCircle,
  Target,
  Zap,
  Users,
  MessageSquare,
  Activity,
  Flag,
  Shield
} from 'lucide-react';

interface DevelopmentPhase {
  phase: string;
  timeRange: string;
  description: string;
  keyEvents: string[];
  keyTasks: string[];
  keyMeasures: string[];
  metrics: {
    hotness: number;
    posts: number;
    users: number;
    sentiment: number;
  };
  status: 'completed' | 'ongoing' | 'planned';
}

interface EventDevelopmentChartProps {
  phases: DevelopmentPhase[];
  className?: string;
}

const EventDevelopmentChart: React.FC<EventDevelopmentChartProps> = ({ 
  phases, 
  className = '' 
}) => {
  const getPhaseIcon = (index: number) => {
    const icons = [Flag, Activity, TrendingUp, Target, CheckCircle, Shield];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-5 h-5" />;
  };

  const getStatusColor = (status: DevelopmentPhase['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-400 bg-green-400/10 text-green-400';
      case 'ongoing':
        return 'border-blue-400 bg-blue-400/10 text-blue-400';
      case 'planned':
        return 'border-gray-400 bg-gray-400/10 text-gray-400';
      default:
        return 'border-gray-400 bg-gray-400/10 text-gray-400';
    }
  };

  const getStatusLabel = (status: DevelopmentPhase['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'ongoing':
        return '进行中';
      case 'planned':
        return '计划中';
      default:
        return '未知';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 发展阶段概览 */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-foreground mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          事件发展阶段
        </h4>
        
        <div className="relative">
          {/* 进度线 */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(phases.filter(p => p.status === 'completed').length / phases.length) * 100}%` 
              }}
            />
          </div>
          
          <div className="flex justify-between">
            {phases.map((phase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex flex-col items-center space-y-2 relative z-10"
              >
                <div className={cn(
                  'w-16 h-16 rounded-full border-2 flex items-center justify-center',
                  getStatusColor(phase.status)
                )}>
                  {getPhaseIcon(index)}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">{phase.phase}</div>
                  <div className="text-xs text-muted-foreground">{phase.timeRange}</div>
                  <div className={cn(
                    'text-xs px-2 py-1 rounded-full mt-1',
                    getStatusColor(phase.status)
                  )}>
                    {getStatusLabel(phase.status)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 详细阶段分析 */}
      <div className="space-y-6">
        {phases.map((phase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'bg-card/50 border-l-4 rounded-lg p-6',
              phase.status === 'completed' && 'border-l-green-400',
              phase.status === 'ongoing' && 'border-l-blue-400',
              phase.status === 'planned' && 'border-l-gray-400'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-xl font-bold text-foreground">{phase.phase}</h4>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {phase.timeRange}
                  </span>
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full font-medium',
                    getStatusColor(phase.status)
                  )}>
                    {getStatusLabel(phase.status)}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">{phase.description}</p>
              </div>
              
              {/* 阶段指标 */}
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{phase.metrics.hotness}</div>
                  <div className="text-xs text-muted-foreground">热度</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{(phase.metrics.sentiment * 100).toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">正面情感</div>
                </div>
              </div>
            </div>

            {/* 三列布局：关键事件、关键任务、关键举措 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 关键事件 */}
              <div className="bg-muted/20 rounded-lg p-4">
                <h5 className="font-semibold text-foreground mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  关键事件
                </h5>
                <div className="space-y-2">
                  {phase.keyEvents.map((event, eventIndex) => (
                    <div key={eventIndex} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-foreground">{event}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 关键任务 */}
              <div className="bg-muted/20 rounded-lg p-4">
                <h5 className="font-semibold text-foreground mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  关键任务
                </h5>
                <div className="space-y-2">
                  {phase.keyTasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-foreground">{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 关键举措 */}
              <div className="bg-muted/20 rounded-lg p-4">
                <h5 className="font-semibold text-foreground mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  关键举措
                </h5>
                <div className="space-y-2">
                  {phase.keyMeasures.map((measure, measureIndex) => (
                    <div key={measureIndex} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-foreground">{measure}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 阶段数据指标 */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-semibold">{phase.metrics.posts.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">贴子</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-semibold">{phase.metrics.users.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">用户</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-semibold">{phase.metrics.hotness}</span>
                  <span className="text-muted-foreground text-sm">热度峰值</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EventDevelopmentChart;
