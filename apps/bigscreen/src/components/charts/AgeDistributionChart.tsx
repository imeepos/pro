import React from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useAgeDistribution } from "@/hooks/useChartData";

import { LoadingSpinner } from "@/components/ui";
import type { EChartsColorParams } from '@/types/charts';

// Safe color validation function
const getSafeColor = (color: string | undefined, fallback: string = '#8b5cf6'): string => {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (!trimmed || !trimmed.match(/^#[0-9A-Fa-f]{6}$/)) return fallback;
  return trimmed;
};

interface AgeDistributionChartProps {
  height?: number;
  className?: string;
}

const AgeDistributionChart: React.FC<AgeDistributionChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useAgeDistribution();

  // 在所有条件检查之前计算option
  const option = React.useMemo(() => {
    if (!data || data.length === 0) {
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
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          const item = params[0];
          return `${item.axisValue}<br/>
                  <span style="color: ${item.color};">●</span> 
                  ${item.seriesName}: ${item.value} 人<br/>
                  <span style="color: #888;">占比: ${data.find(d => d.age === item.axisValue)?.percentage.toFixed(1)}%</span>`;
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
        data: data.map((item) => item.age),
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
          formatter: (value: number) => `${value}人`,
        },
        splitLine: {
          lineStyle: {
            color: "#374151",
          },
        },
      },
      series: [
        {
          name: "用户数量",
          type: "bar",
          data: data.map((item) => item.value),
          itemStyle: {
            color: (params: EChartsColorParams) => {
              const colors = [
                "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff", "#f3e8ff",
              ];
              const dataIndex = typeof params.dataIndex === 'number' ? params.dataIndex : 0;
              const color = colors[dataIndex] || colors[0];
              return {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: getSafeColor(color, "#8b5cf6") },
                  { offset: 1, color: `${getSafeColor(color, "#8b5cf6")}80` },
                ],
              };
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            show: true,
            position: "top",
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 12,
            formatter: (params: any) => {
              const item = data.find(d => d.value === params.value);
              return `${item?.percentage.toFixed(1)}%`;
            },
          },
          barWidth: "60%",
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 800,
          animationEasing: "elasticOut",
        },
      ],
    };
  }, [isDark, data]);

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoadingSpinner size="large" text="加载年龄分布数据..." />
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
        <p className="text-gray-500">暂无年龄分布数据</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {option && (
        <ReactECharts
          option={option}
          style={{ height: height ? `${height}px` : `100%`, width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      )}
    </motion.div>
  );
};

export default AgeDistributionChart;