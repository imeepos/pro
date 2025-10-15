import React, { memo, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { EChartsOption } from 'echarts';

interface ChartEventParams {
  type: string;
  name?: string;
  value?: number | string;
  data?: unknown;
  color?: string;
  seriesName?: string;
  axisValue?: string;
}

interface MemoizedChartProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  loading?: boolean;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  onEvents?: Record<string, (params: ChartEventParams) => void>;
  style?: React.CSSProperties;
}

// 深度比较函数，避免使用JSON.stringify
const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(
        (obj1 as Record<string, unknown>)[key], 
        (obj2 as Record<string, unknown>)[key]
      )) {
        return false;
      }
    }
    return true;
  }
  
  return false;
};

const MemoizedChart: React.FC<MemoizedChartProps> = ({
  option,
  height = 400,
  className,
  loading = false,
  notMerge = true,
  lazyUpdate = true,
  onEvents,
  style,
}) => {
  const previousOption = useRef<EChartsOption>();
  
  // 使用更智能的选项记忆化
  const memoizedOption = useMemo(() => {
    if (!previousOption.current || !deepEqual(previousOption.current, option)) {
      previousOption.current = option;
      return option;
    }
    return previousOption.current;
  }, [option]);

  // Memoize the style object
  const chartStyle = useMemo(() => ({
    height: typeof height === 'number' ? `${height}px` : height,
    width: '100%',
    ...style,
  }), [height, style]);

  // Memoize event handlers to prevent unnecessary re-renders
  const memoizedOnEvents = useMemo(() => onEvents, [onEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('w-full h-full', className)}
    >
      <ReactECharts
        option={memoizedOption}
        style={chartStyle}
        opts={{ renderer: 'canvas' }}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
        showLoading={loading}
        onEvents={memoizedOnEvents}
      />
    </motion.div>
  );
};

export default memo(MemoizedChart);