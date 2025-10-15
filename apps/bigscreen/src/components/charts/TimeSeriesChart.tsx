import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { TimeSeriesData } from '@/types';
import { cn } from '@/utils';
import { useTheme } from '@/hooks/useTheme';


interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title?: string;
  height?: number;
  className?: string;
  showLegend?: boolean;
  showToolbox?: boolean;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title = '时间序列分析',
  height = 0,
  className,
  showLegend = true,
  showToolbox = true,
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
            fontSize: 14
          }
        }
      };
    }

    const timestamps = data.map(item => item.timestamp);
    const values = data.map(item => item.value);
    const positiveValues = data.map(item => item.positive || 0);
    const negativeValues = data.map(item => item.negative || 0);
    const neutralValues = data.map(item => item.neutral || 0);

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
        },
        formatter: (params: any) => {
          let result = `<div style="margin-bottom: 8px; font-weight: bold;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const {color} = param;
            const {value} = param;
            result += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
                <span style="margin-right: 8px;">${param.seriesName}:</span>
                <span style="font-weight: bold;">${value}</span>
              </div>
            `;
          });
          return result;
        },
      },
      legend: showLegend ? {
        data: ['总量', '正面', '负面', '中性'],
        top: 30,
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
        },
      } : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: showLegend ? '15%' : '10%',
        containLabel: true,
      },
      toolbox: showToolbox ? {
        feature: {
          saveAsImage: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
          },
          dataZoom: {
            yAxisIndex: 'none',
          },
          restore: {},
          magicType: {
            type: ['line', 'bar'],
          },
        },
        iconStyle: {
          borderColor: isDark ? '#ffffff' : '#111827',
        },
        emphasis: {
          iconStyle: {
            borderColor: '#3b82f6',
          },
        },
      } : undefined,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timestamps,
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          },
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#111827',
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          },
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#111827',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '总量',
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            color: '#3b82f6',
            width: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
              ],
            },
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: '正面',
          type: 'line',
          data: positiveValues,
          smooth: true,
          lineStyle: {
            color: '#10b981',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: '负面',
          type: 'line',
          data: negativeValues,
          smooth: true,
          lineStyle: {
            color: '#ef4444',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: '中性',
          type: 'line',
          data: neutralValues,
          smooth: true,
          lineStyle: {
            color: '#6b7280',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [data, title, showLegend, showToolbox, isDark]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('chart-container', className)}
    >
      {option ? (
        <ReactECharts
          option={option}
          style={{ height: height ? `${height}px` : "100%", width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          暂无数据
        </div>
      )}
    </motion.div>
  );
};

export default TimeSeriesChart;
