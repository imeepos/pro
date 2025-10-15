import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/hooks/useTheme';

// Safe color validation function
const getSafeColor = (color: string | undefined, fallback: string = '#3b82f6'): string => {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (!trimmed || !trimmed.match(/^#[0-9A-Fa-f]{6}$/)) return fallback;
  return trimmed;
};

interface MiniTrendChartProps {
  data: number[];
  color?: string;
  type?: 'line' | 'bar';
  height?: number;
}

const MiniTrendChart: React.FC<MiniTrendChartProps> = ({
  data,
  color = '#3b82f6',
  type = 'line',
  height = 0,
}) => {
  const { isDark } = useTheme();
  
  const option = React.useMemo(() => {
    // Return null if no valid data to prevent gradient rendering errors
    if (!Array.isArray(data) || data.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 14,
          },
        },
      };
    }

    return {
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        show: false,
        data: data.map((_, index) => index),
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          data,
          type,
          smooth: type === 'line',
          symbol: 'none',
          lineStyle:
            type === 'line'
              ? {
                  color: getSafeColor(color),
                  width: 2,
                }
              : undefined,
          itemStyle: {
            color:
              type === 'bar'
                ? {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: getSafeColor(color) },
                      { offset: 1, color: `${getSafeColor(color)}80` },
                    ],
                  }
                : getSafeColor(color),
          },
          areaStyle:
            type === 'line'
              ? {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: `${getSafeColor(color)}40` },
                      { offset: 1, color: `${getSafeColor(color)}10` },
                    ],
                  },
                }
              : undefined,
          barWidth: type === 'bar' ? '60%' : undefined,
        },
      ],
      animation: false,
    };
  }, [data, color, type, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: height ? `${height}px` : `100%`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default MiniTrendChart;
