import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { createLogger } from '@/utils/logger';
import { CommonAPI } from "@/services/api";

interface SimpleSentimentPieChartProps {
  height?: number;
  className?: string;
}

const logger = createLogger('SimpleSentimentPieChart');

const SimpleSentimentPieChart: React.FC<SimpleSentimentPieChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const [mockData, setMockData] = useState<Array<{name: string, value: number, color: string}>>([]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const data = await CommonAPI.getSentimentPie();
        if (cancelled) return;
        
        if (Array.isArray(data)) {
          setMockData(data);
        } else {
          logger.warn('Sentiment pie data is not an array:', data);
          setMockData([]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch sentiment pie data:', error);
        setMockData([]);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const total = Array.isArray(mockData) ? mockData.reduce((sum, item) => sum + item.value, 0) : 0;

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
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        formatter: (params: any) => {
          const percentage = ((params.value / total) * 100).toFixed(1);
          return `${params.name}: ${params.value} (${percentage}%)`;
        },
      },
      legend: {
        orient: "horizontal",
        bottom: 10,
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
        },
        formatter: (name: string) => {
          const item = mockData.find((d) => d.name === name);
          if (!item) return name;
          const percentage = ((item.value / total) * 100).toFixed(1);
          return `${name} (${percentage}%)`;
        },
      },
      series: [
        {
          name: "情感分析",
          type: "pie",
          radius: ["30%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: "rgba(0, 0, 0, 0.2)",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            color: isDark ? "#ffffff" : "#111827",
            formatter: (params: any) => {
              const percentage = ((params.value / total) * 100).toFixed(1);
              return `${params.name}\n${percentage}%`;
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: isDark
                ? "rgba(255,255,255, 0.5)"
                : "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: true,
            lineStyle: {
              color: isDark ? "#ffffff" : "#111827",
            },
          },
          data: mockData.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: item.color || '#6b7280',
            },
          })),
          animationType: "scale",
          animationEasing: "elasticOut",
          animationDelay: (_idx: number) => Math.random() * 200,
        },
      ],
      graphic: [
        {
          type: "text",
          left: "center",
          top: "middle",
          z: 100,
          style: {
            text: `总计\n${total}`,
            textAlign: "center",
            textVerticalAlign: "middle",
            fill: isDark ? "#f3f4f6" : "#111827",
            fontSize: 14,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [total, isDark, mockData]);

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

export default SimpleSentimentPieChart;
