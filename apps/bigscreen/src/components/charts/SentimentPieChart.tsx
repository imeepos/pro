import React from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { cn, formatNumber } from "@/utils";
import { useTheme } from "@/hooks/useTheme";
import { useSentimentData } from "@/hooks/useChartData";

import { LoadingSpinner } from "@/components/ui";

interface SentimentPieChartProps {
  title?: string;
  height?: number;
  className?: string;
  showPercentage?: boolean;
}

const SentimentPieChart: React.FC<SentimentPieChartProps> = ({
  title = "情感分析分布",
  height = 0,
  className,
  showPercentage = true,
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useSentimentData();

  // 在所有条件检查之前计算option
  const option = React.useMemo(() => {
    if (!data || typeof data.positive !== 'number' || typeof data.negative !== 'number' || typeof data.neutral !== 'number') {
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
    
    const {total} = data;
    const pieData = [
      {
        value: data.positive,
        name: "正面",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#10b981" },
              { offset: 1, color: "#059669" },
            ],
          },
        },
      },
      {
        value: data.negative,
        name: "负面",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#ef4444" },
              { offset: 1, color: "#dc2626" },
            ],
          },
        },
      },
      {
        value: data.neutral,
        name: "中性",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#6b7280" },
              { offset: 1, color: "#4b5563" },
            ],
          },
        },
      },
    ];

    return {
      title: {
        text: title,
        left: "center",
        top: 20,
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
        },
        formatter: (params: any) => {
          const percentage = ((params.value / total) * 100).toFixed(1);
          return `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${
                params.color || '#6b7280'
              }; border-radius: 50%; margin-right: 8px;"></span>
              <span style="font-weight: bold; margin-right: 8px;">${
                params.name
              }</span>
            </div>
            <div style="margin-left: 20px;">
              <div>数量: <span style="font-weight: bold;">${formatNumber(
                params.value
              )}</span></div>
              <div>占比: <span style="font-weight: bold;">${percentage}%</span></div>
            </div>
          `;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
        },
        formatter: (name: string) => {
          const item = pieData.find((d) => d.name === name);
          if (!item) return name;
          const percentage = ((item.value / total) * 100).toFixed(1);
          return `${name} ${showPercentage ? `(${percentage}%)` : ""}`;
        },
      },
      series: [
        {
          name: "情感分析",
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: "rgba(0, 0, 0, 0.2)",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: "bold",
              color: isDark ? "#ffffff" : "#111827",
              formatter: (params: any) => {
                const percentage = ((params.value / total) * 100).toFixed(1);
                return `${params.name}\n${formatNumber(
                  params.value
                )}\n${percentage}%`;
              },
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: false,
          },
          data: pieData,
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
          style: {
            text: `总计\n${formatNumber(total)}`,
            textAlign: "center",
            fill: isDark ? "#ffffff" : "#111827",
            fontSize: 16,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [data, title, showPercentage, isDark]);

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <LoadingSpinner size="large" text="加载情感分析数据..." />
      </div>
    );
  }

  // 如果出错，显示错误信息
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full", className)}>
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
  if (!data) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-gray-500">暂无情感分析数据</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("chart-container", className)}
    >
      {option && (
        <ReactECharts
          option={option}
          style={{ height: height ? `${height}px` : `100%`, width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={true}
        />
      )}
    </motion.div>
  );
};

export default SentimentPieChart;
