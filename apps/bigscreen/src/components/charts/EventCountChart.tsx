import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { CommonAPI } from '@/services/api';

interface EventCountChartProps {
  height?: number;
  className?: string;
}

const logger = createLogger('EventCountChart');

const EventCountChart: React.FC<EventCountChartProps> = ({
  height = 0,
  className = ''
}) => {
  const { isDark } = useTheme();
  const [mockData, setMockData] = useState<Array<{date: string, count: number}>>([]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const data = await CommonAPI.getDateSeries(7);
        if (cancelled) return;
        
        if (Array.isArray(data)) {
          setMockData(data);
        } else {
          logger.warn('Date series data is not an array:', data);
          setMockData([]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch date series data:', error);
        setMockData([]);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const option = React.useMemo(() => {
    // Return minimal option if no valid data
    if (!Array.isArray(mockData) || mockData.length === 0) {
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

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: mockData.map(item => item.date),
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280'
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280'
        },
        splitLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      series: [
        {
          data: mockData.map(item => item.count),
          type: 'bar',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#1d4ed8' }
              ]
            }
          },
          emphasis: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#60a5fa' },
                  { offset: 1, color: '#3b82f6' }
                ]
              }
            }
          }
        }
      ]
    };
  }, [isDark, mockData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <ReactECharts
        option={option}
        style={{ height: height ? `${height}px` : `100%`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </motion.div>
  );
};

export default EventCountChart;
