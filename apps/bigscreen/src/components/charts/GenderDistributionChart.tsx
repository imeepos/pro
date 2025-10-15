import React from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useGenderDistribution } from "@/hooks/useChartData";

import { LoadingSpinner } from "@/components/ui";
import type { EChartsLabelParams } from '@/types/charts';

interface GenderDistributionChartProps {
  height?: number;
  className?: string;
}

const GenderDistributionChart: React.FC<GenderDistributionChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useGenderDistribution();

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
    
    // const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        formatter: (params: EChartsLabelParams) => {
          const item = data.find(d => d.name === params.name);
          return `${params.name}<br/>
                  <span style="color: ${params.color || '#6b7280'};">●</span> 
                  数量: ${params.value} 人<br/>
                  <span style="color: #888;">占比: ${item?.percentage.toFixed(1)}%</span>`;
        },
      },
      legend: {
        orient: "horizontal",
        bottom: 10,
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
        },
        formatter: (name: string) => {
          const item = data.find((d) => d.name === name);
          if (!item) return name;
          const percentage = item.percentage.toFixed(1);
          return `${name} (${percentage}%)`;
        },
      },
      series: [
        {
          name: "性别分布",
          type: "pie",
          radius: ["30%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark
              ? "rgba(255,255,255, 0.2)"
              : "rgba(0, 0, 0, 0.2)",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            color: isDark ? "#ffffff" : "#111827",
            formatter: (params: EChartsLabelParams) => {
              const item = data.find(d => d.name === params.name);
              return `${params.name}\n${item?.percentage.toFixed(1)}%`;
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
          data: data.map((item) => ({
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
    };
  }, [isDark, data]);

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoadingSpinner size="large" text="加载性别分布数据..." />
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
        <p className="text-gray-500">暂无性别分布数据</p>
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

export default GenderDistributionChart;