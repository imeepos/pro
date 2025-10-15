import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, Clock, Activity } from 'lucide-react';
import { cn, formatRelativeTime } from '@/utils';

interface RealTimeIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date;
  updateInterval?: number;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  isConnected,
  lastUpdate,
  updateInterval = 30000,
  className,
  showLabel = true,
  compact = false
}) => {
  const [isActive, setIsActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(prev => !prev);
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        color: 'text-destructive',
        bgColor: 'bg-destructive/20',
        pulseColor: 'bg-destructive',
        label: '连接断开',
        description: '等待重新连接...'
      };
    }

    const timeSinceUpdate = currentTime.getTime() - lastUpdate.getTime();
    const isStale = timeSinceUpdate > updateInterval * 2;

    if (isStale) {
      return {
        icon: Clock,
        color: 'text-warning',
        bgColor: 'bg-warning/20',
        pulseColor: 'bg-warning',
        label: '数据延迟',
        description: `上次更新: ${formatRelativeTime(lastUpdate)}`
      };
    }

    return {
      icon: Activity,
      color: 'text-sentiment-positive',
      bgColor: 'bg-sentiment-positive/20',
      pulseColor: 'bg-sentiment-positive',
      label: '实时更新',
      description: `${formatRelativeTime(lastUpdate)} · 每${updateInterval/1000}秒更新`
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    // 如果不显示标签，只显示一个简单的状态图标
    if (!showLabel) {
      return (
        <div className={cn('relative', className)}>
          {isConnected ? (
            // 连接状态：显示脉冲圆点
            <>
              <motion.div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: '#22c55e',
                  backgroundColor: isActive ? '#22c55e' : 'transparent'
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute inset-0 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: '#22c55e'
                }}
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.6, 0, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          ) : (
            // 断开状态：显示WiFi断开图标
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <WifiOff className="w-4 h-4 text-destructive" />
            </motion.div>
          )}
        </div>
      );
    }

    // 带标签的紧凑模式
    return (
      <div className={cn(
        'flex items-center space-x-3 px-4 py-2 rounded-lg border',
        config.bgColor,
        className
      )}>
        <div className="relative">
          {isConnected ? (
            // 连接状态：显示脉冲圆点
            <>
              <motion.div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: '#22c55e',
                  backgroundColor: isActive ? '#22c55e' : 'transparent'
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute inset-0 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: '#22c55e'
                }}
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.6, 0, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          ) : (
            // 断开状态：显示WiFi断开图标
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <WifiOff className="w-4 h-4 text-destructive" />
            </motion.div>
          )}
        </div>

        <div className="flex flex-col">
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.description.split(' · ')[0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'flex items-center space-x-3 px-3 py-2 rounded-lg',
        config.bgColor,
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        {isConnected ? (
          <>
            <Icon className={cn('w-4 h-4', config.color)} />
            <motion.div
              className={cn(
                'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                isActive ? config.pulseColor : `${config.pulseColor}/50`
              )}
              animate={{
                scale: isActive ? [1, 1.3, 1] : 1,
                opacity: isActive ? [0.7, 1, 0.7] : 0.5
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </>
        ) : (
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <WifiOff className="w-4 h-4 text-destructive" />
          </motion.div>
        )}
      </div>

      {showLabel && (
        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {config.description}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RealTimeIndicator;
