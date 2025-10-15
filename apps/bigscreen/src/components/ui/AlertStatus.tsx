import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Eye,
  TrendingUp
} from 'lucide-react';
import { cn, formatNumber } from '@/utils';

interface AlertStatusProps {
  level: 'normal' | 'attention' | 'warning' | 'critical';
  message: string;
  count?: number;
  timestamp?: Date;
  className?: string;
  compact?: boolean;
}

const AlertStatus: React.FC<AlertStatusProps> = ({
  level,
  message,
  count,
  timestamp,
  className,
  compact = false
}) => {
  const getAlertConfig = () => {
    switch (level) {
      case 'normal':
        return {
          icon: CheckCircle,
          bgClass: 'alert-normal',
          textClass: 'text-sentiment-positive',
          iconClass: 'text-sentiment-positive',
          animation: '',
          label: '正常'
        };
      case 'attention':
        return {
          icon: Eye,
          bgClass: 'alert-attention',
          textClass: 'text-alert-warning',
          iconClass: 'text-alert-warning',
          animation: 'animate-pulse-slow',
          label: '关注'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgClass: 'alert-warning',
          textClass: 'text-alert-danger',
          iconClass: 'text-alert-danger',
          animation: 'animate-bounce-slow',
          label: '预警'
        };
      case 'critical':
        return {
          icon: XCircle,
          bgClass: 'alert-critical',
          textClass: 'text-sentiment-negative',
          iconClass: 'text-sentiment-negative',
          animation: 'alert-critical',
          label: '警报'
        };
      default:
        return {
          icon: CheckCircle,
          bgClass: 'alert-normal',
          textClass: 'text-sentiment-positive',
          iconClass: 'text-sentiment-positive',
          animation: '',
          label: '正常'
        };
    }
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <motion.div
        className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-lg',
          config.bgClass,
          config.animation,
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Icon className={cn('w-4 h-4', config.iconClass)} />
        <span className={cn('text-sm font-medium', config.textClass)}>
          {config.label}
        </span>
        {count && (
          <span className={cn('text-sm font-bold', config.textClass)}>
            ({formatNumber(count)})
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        'p-6 rounded-lg transition-all duration-300 border',
        config.bgClass,
        config.animation,
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start space-x-4">
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
          config.bgClass
        )}>
          <Icon className={cn('w-6 h-6', config.iconClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className={cn('font-semibold text-xl', config.textClass)}>
              舆情{config.label}
            </h4>
            {count && (
              <div className="text-right">
                <div className={cn('text-3xl font-bold font-mono', config.textClass)}>
                  {formatNumber(count)}
                </div>
                <div className="text-xs text-muted-foreground">监控事件</div>
              </div>
            )}
          </div>

          <p className={cn('text-base leading-relaxed', config.textClass, 'opacity-90 mb-3')}>
            {message}
          </p>

          {timestamp && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>实时监控中</span>
              </div>
              <span className="text-muted-foreground">
                {timestamp.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AlertStatus;
