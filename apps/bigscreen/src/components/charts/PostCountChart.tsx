import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { createLogger } from '@/utils/logger';
import { CommonAPI } from "@/services/api";

interface PostCountChartProps {
  height?: number;
  className?: string;
}

const logger = createLogger('PostCountChart');

const PostCountChart: React.FC<PostCountChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const [mockData, setMockData] = useState<Array<{date: string, count: number}>>([]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const data = await CommonAPI.getPostCountHistory(7);
        if (cancelled) return;
        setMockData(data);
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch post count history data:', error);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const option = React.useMemo(() => {
    // Return null if no data to prevent gradient rendering errors
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
          color: isDark ? "#ffffff" : "#111827",
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: mockData.map((item) => item.date),
        axisLine: {
          lineStyle: {
            color: "#374151",
          },
        },
        axisLabel: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          lineStyle: {
            color: "#374151",
          },
        },
        axisLabel: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
        splitLine: {
          lineStyle: {
            color: "#374151",
          },
        },
      },
      series: [
        {
          data: mockData.map((item) => item.count),
          type: "line",
          smooth: true,
          lineStyle: {
            color: "#10b981",
            width: 3,
          },
          itemStyle: {
            color: "#10b981",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.3)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.05)" },
              ],
            },
          },
          emphasis: {
            itemStyle: {
              color: "#34d399",
            },
          },
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
      <ReactECharts
        option={option}
        style={{ height: height ? `${height}px` : `100%`, width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    </motion.div>
  );
};

export default PostCountChart;
