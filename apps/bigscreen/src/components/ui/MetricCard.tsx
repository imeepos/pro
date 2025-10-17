import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  FileText,
  Users,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/utils';
import CountUp from './CountUp';
import SentimentIndicator from './SentimentIndicator';

type SentimentLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'gray' | 'purple' | 'yellow' | 'sentiment-positive' | 'sentiment-negative' | 'sentiment-neutral';
  className?: string;
  loading?: boolean;
  showChart?: boolean;
  chartComponent?: React.ReactNode;
  size?: 'small' | 'normal' | 'large' | 'xlarge' | 'tiny';
  animated?: boolean;
  sentiment?: {
    type: 'positive' | 'negative' | 'neutral';
    level: SentimentLevel;
  };
}

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Users,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
};

const colorMap = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    icon: 'text-blue-400',
    gradient: 'from-blue-400 to-blue-600',
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    icon: 'text-green-400',
    gradient: 'from-green-400 to-green-600',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    icon: 'text-red-400',
    gradient: 'from-red-400 to-red-600',
  },
  gray: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    icon: 'text-gray-400',
    gradient: 'from-gray-400 to-gray-600',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    icon: 'text-purple-400',
    gradient: 'from-purple-400 to-purple-600',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  'sentiment-positive': {
    bg: 'bg-sentiment-positive/20',
    text: 'text-sentiment-positive',
    icon: 'text-sentiment-positive',
    gradient: 'from-sentiment-positive to-sentiment-positive-dark',
  },
  'sentiment-negative': {
    bg: 'bg-sentiment-negative/20',
    text: 'text-sentiment-negative',
    icon: 'text-sentiment-negative',
    gradient: 'from-sentiment-negative to-sentiment-negative-dark',
  },
  'sentiment-neutral': {
    bg: 'bg-sentiment-neutral/20',
    text: 'text-sentiment-neutral',
    icon: 'text-sentiment-neutral',
    gradient: 'from-sentiment-neutral to-sentiment-neutral-dark',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon = 'BarChart3',
  color = 'blue',
  className,
  loading = false,
  showChart = false,
  chartComponent,
  size = 'normal',
  animated = true,
  sentiment,
}) => {
  const IconComponent = iconMap[icon] || BarChart3;
  const colors = colorMap[color];

  const isPositiveChange = change !== undefined && change >= 0;
  const changeIcon = isPositiveChange ? ArrowUp : ArrowDown;

  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          card: 'p-8',
          title: 'section-title',
          value: 'text-5xl',
          change: 'text-lg',
          icon: 'w-8 h-8'
        };
      case 'xlarge':
        return {
          card: 'p-10',
          title: 'dashboard-title',
          value: 'metric-value-large',
          change: 'text-xl',
          icon: 'w-12 h-12'
        };
      case 'small':
        return {
          card: 'p-4',
          title: 'text-xs',
          value: 'text-lg',
          change: 'text-xs',
          icon: 'w-4 h-4'
        };
      case 'tiny':
        return {
          card: 'p-3',
          title: 'text-sm',
          value: 'text-[12px]',
          change: 'text-[10px]',
          icon: 'w-3 h-3'
        };
      default:
        return {
          card: 'p-6',
          title: 'text-lg',
          value: 'text-2xl',
          change: 'text-sm',
          icon: 'w-6 h-6'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const ChangeIcon = changeIcon;

  if (loading) {
    return (
      <div className={cn('data-card animate-pulse', className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-20"></div>
            <div className="h-8 bg-gray-700 rounded w-16"></div>
            <div className="h-3 bg-gray-700 rounded w-12"></div>
          </div>
          <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn('glass-card cursor-pointer', sizeClasses.card, className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={cn(
            size === 'tiny' ? 'text-foreground mb-2' : 'text-foreground mb-2',
            sizeClasses.title
          )}>
            {title}
          </h3>

          <div className="space-y-2">
            <div className={cn(
              'font-bold bg-gradient-to-r bg-clip-text text-transparent',
              colors.gradient,
              sizeClasses.value
            )}>
              <CountUp
                end={value}
                animated={animated}
                size={size === 'xlarge' ? 'xl' : size === 'large' ? 'lg' : size === 'small' ? 'sm' : 'md'}
              />
            </div>

            {change !== undefined && (
              <div className="flex items-center space-x-1">
                <ChangeIcon className={cn(
                  'w-3 h-3',
                  isPositiveChange ? 'text-sentiment-positive' : 'text-sentiment-negative'
                )} />
                <span className={cn(
                  'font-medium',
                  sizeClasses.change,
                  isPositiveChange ? 'text-sentiment-positive' : 'text-sentiment-negative'
                )}>
                  {Math.abs(change).toFixed(1)}%
                </span>
                <span className={cn('text-muted-foreground', sizeClasses.change)}>
                  vs 上期
                </span>
              </div>
            )}

            {sentiment && (
              <div className="flex items-center space-x-2 mt-2">
                <SentimentIndicator
                  type={sentiment.type}
                  level={sentiment.level}
                  size={size === 'xlarge' ? 'lg' : size === 'small' ? 'sm' : 'md'}
                  showLabel={size !== 'normal' && size !== 'small'}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={cn(
            'rounded-lg flex items-center justify-center py-1 px-2',
            colors.bg,
            sizeClasses.icon
          )}>
            <IconComponent className={cn(sizeClasses.icon, colors.icon)} />
          </div>

          {/* 小图表区域 */}
          {showChart && chartComponent && (
            <div className="w-16 h-10 overflow-hidden rounded-md bg-muted/30 p-1">
              {chartComponent}
            </div>
          )}
        </div>
      </div>
      
      {/* 装饰性渐变条 */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r rounded-b-lg',
        colors.gradient
      )}></div>
    </motion.div>
  );
};

export default React.memo(MetricCard);
