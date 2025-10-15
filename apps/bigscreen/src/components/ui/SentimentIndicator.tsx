import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface SentimentIndicatorProps {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  type: 'positive' | 'negative' | 'neutral';
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({
  level,
  type,
  animated = false,
  size = 'md',
  showLabel = false,
  className
}) => {
  const getSentimentColor = () => {
    const alpha = level / 10;
    switch (type) {
      case 'negative':
        return `rgba(239, 68, 68, ${alpha})`; // #ef4444 with alpha
      case 'positive':
        return `rgba(34, 197, 94, ${alpha})`; // #22c55e with alpha
      case 'neutral':
        return `rgba(107, 114, 128, ${alpha})`; // #6b7280 with alpha
      default:
        return `rgba(107, 114, 128, ${alpha})`; // #6b7280 with alpha
    }
  };

  const getSentimentBorderColor = () => {
    switch (type) {
      case 'negative':
        return '#ef4444';
      case 'positive':
        return '#22c55e';
      case 'neutral':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  const getLabelText = () => {
    const typeLabels = {
      positive: '正面',
      negative: '负面',
      neutral: '中性'
    };
    return `${typeLabels[type]} (${level}/10)`;
  };

  const indicatorElement = (
    <motion.div
      className={cn(
        'rounded-full border-2 transition-all duration-300',
        getSizeClasses(),
        animated && 'animate-pulse',
        className
      )}
      style={{
        backgroundColor: getSentimentColor(),
        borderColor: getSentimentBorderColor(),
        boxShadow: level > 7 ? `0 0 8px ${getSentimentBorderColor()}` : 'none'
      }}
      initial={animated ? { scale: 0.8, opacity: 0.7 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={animated ? { duration: 0.6, repeat: Infinity, repeatType: 'reverse' } : undefined}
    />
  );

  if (showLabel) {
    return (
      <div className="flex items-center space-x-2">
        {indicatorElement}
        <span className="text-sm text-muted-foreground">
          {getLabelText()}
        </span>
      </div>
    );
  }

  return indicatorElement;
};

export default SentimentIndicator;
