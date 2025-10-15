import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { createLogger } from '@/utils/logger';
import { CommonAPI } from "@/services/api";
import type { EChartsFormatterParams } from '@/types/charts';

interface EventTypeBarChartProps {
  height?: number;
  className?: string;
}

const logger = createLogger('EventTypeBarChart');

const EventTypeBarChart: React.FC<EventTypeBarChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const [mockData, setMockData] = useState<Array<{name: string, value: number, color: string}>>([]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const data = await CommonAPI.getEventTypes();
        if (cancelled) return;
        
        // 确保数据是数组格式
        if (Array.isArray(data)) {
          setMockData(data);
        } else {
          logger.warn('Event types data is not an array:', data);
          setMockData([]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch event types data:', error);
        setMockData([]);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const option = React.useMemo(() => {
    // Return null if no valid data to prevent gradient rendering errors
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
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        formatter: (params: EChartsFormatterParams[]) => {
          const data = params[0];
          return `${data.name}: ${data.value}`;
        },
      },
      grid: {
        left: "15%",
        right: "10%",
        top: "10%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: Array.isArray(mockData) ? mockData.map((item) => item.name) : [],
        axisLabel: {
          color: isDark ? "#f3f4f6" : "#111827",
          fontSize: 12,
          rotate: 0,
        },
        axisLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        axisTick: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: isDark ? "#f3f4f6" : "#111827",
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        axisTick: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        splitLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#e5e7eb",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "事件类型",
          type: "bar",
          data: mockData.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: item.color || "#6b7280",
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: "60%",
          label: {
            show: true,
            position: "top",
            color: isDark ? "#f3f4f6" : "#111827",
            fontSize: 12,
            fontWeight: "bold",
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 800,
          animationEasing: "elasticOut",
        },
      ],
    };
  }, [isDark, mockData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {option ? (
        <ReactECharts
          option={option}
          style={{ height: height ? `${height}px` : `100%`, width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          加载中...
        </div>
      )}
    </motion.div>
  );
};

export default EventTypeBarChart;
