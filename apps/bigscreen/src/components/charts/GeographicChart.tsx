import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useGeographicData } from '@/hooks/useChartData';
import { LoadingSpinner } from '@/components/ui';

interface GeographicChartProps {
  height?: number;
  className?: string;
}

const GeographicChart: React.FC<GeographicChartProps> = ({
  height = 0,
  className = ''
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useGeographicData();

  // 在所有条件检查之前计算option
  const option = React.useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    // 按值排序
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: {
          color: '#ffffff',
        },
        formatter: (params: any) => {
          return `${params.name}: ${params.value}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
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
      yAxis: {
        type: 'category',
        data: sortedData.map(item => item.name),
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb'
          }
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280'
        }
      },
      series: [
        {
          name: '数量',
          type: 'bar',
          data: sortedData.map(item => item.value),
          itemStyle: {
            color: (params: any) => {
              const colors = [
                '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'
              ];
              const dataIndex = typeof params.dataIndex === 'number' ? params.dataIndex : 0;
              return colors[dataIndex % colors.length];
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            }
          },
          label: {
            show: true,
            position: 'right',
            color: isDark ? '#ffffff' : '#111827',
            fontSize: 12
          }
        }
      ]
    };
  }, [data, isDark]);

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoadingSpinner size="large" text="加载地理分布数据..." />
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
        <p className="text-gray-500">暂无地理分布数据</p>
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

export default GeographicChart;