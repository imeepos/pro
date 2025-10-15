import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn, formatNumber } from '@/utils';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  onComplete?: () => void;
  'data-testid'?: string;
}

const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  size = 'md',
  animated = true,
  onComplete,
  'data-testid': dataTestId
}) => {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'md':
        return 'text-2xl';
      case 'lg':
        return 'text-4xl';
      case 'xl':
        return 'text-6xl metric-value-large';
      default:
        return 'text-2xl';
    }
  };

  const formatValue = (value: number) => {
    const formattedNumber = decimals > 0 
      ? value.toFixed(decimals)
      : Math.floor(value).toString();
    
    return `${prefix}${formatNumber(parseFloat(formattedNumber))}${suffix}`;
  };

  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数让动画更自然
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = start + (end - start) * easeOutQuart;

    setCount(currentValue);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
      onComplete?.();
    }
  };

  useEffect(() => {
    if (!animated) {
      setCount(end);
      return;
    }

    setIsAnimating(true);
    startTimeRef.current = undefined;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [end, start, duration, animated]);

  return (
    <motion.span
      data-testid={dataTestId}
      className={cn(
        'font-mono font-bold tabular-nums transition-all duration-300',
        getSizeClasses(),
        isAnimating && 'data-update-fade',
        className
      )}
      initial={animated ? { opacity: 0, scale: 0.8 } : false}
      animate={animated ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {formatValue(count)}
    </motion.span>
  );
};

export default React.memo(CountUp);
