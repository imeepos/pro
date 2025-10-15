import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useSentimentTrend } from '@/hooks/useChartData';
import { LoadingSpinner } from '@/components/ui';

interface SentimentTrendChartProps {
  height?: number;
  className?: string;
  hours?: number;
}

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  height = 0,
  className = '',
  hours = 24
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useSentimentTrend(hours);

  // 在所有条件检查之前计算option
  const option = React.useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    
    // 提取时间轴和数据
    const timeLabels = data.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleDateString('zh-CN', { 
        month: 'numeric', 
        day: 'numeric',
        hour: 'numeric'
      });
    });

    const positiveData = data.map(item => item.positive);
    const negativeData = data.map(item => item.negative);
    const neutralData = data.map(item => item.neutral);
    const totalData = data.map(item => item.positive + item.negative + item.neutral);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: {
          color: '#ffffff',
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: ['总量', '正面', '负面', '中性'],
        textStyle: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: timeLabels,
          axisLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          },
          axisLabel: {
            color: isDark ? '#9ca3af' : '#6b7280'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '数量',
          position: 'left',
          axisLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          },
          axisLabel: {
            color: isDark ? '#9ca3af' : '#6b7280'
          },
          splitLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          }
        },
        {
          type: 'value',
          name: '百分比',
          position: 'right',
          axisLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          },
          axisLabel: {
            color: isDark ? '#9ca3af' : '#6b7280',
            formatter: '{value}%'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '总量',
          type: 'bar',
          yAxisIndex: 0,
          data: totalData,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.3)' }
              ]
            }
          }
        },
        {
          name: '正面',
          type: 'line',
          yAxisIndex: 1,
          data: positiveData,
          smooth: true,
          lineStyle: {
            color: '#10b981',
            width: 3
          },
          itemStyle: {
            color: '#10b981'
          },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          name: '负面',
          type: 'line',
          yAxisIndex: 1,
          data: negativeData,
          smooth: true,
          lineStyle: {
            color: '#ef4444',
            width: 3
          },
          itemStyle: {
            color: '#ef4444'
          },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          name: '中性',
          type: 'line',
          yAxisIndex: 1,
          data: neutralData,
          smooth: true,
          lineStyle: {
            color: '#6b7280',
            width: 3
          },
          itemStyle: {
            color: '#6b7280'
          },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    };
  }, [data, isDark]);

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoadingSpinner size="large" text="加载情感趋势数据..." />
      </div>
    );
  }

  // 如果出错，显示错误信息
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500">暂无情感趋势数据</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`w-full h-full ${className}`}
    >
      {option && (
        <ReactECharts
          option={option}
          style={{ 
            height: height ? `${height}px` : '100%', 
            width: '100%' 
          }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </motion.div>
  );
};

export default SentimentTrendChart;