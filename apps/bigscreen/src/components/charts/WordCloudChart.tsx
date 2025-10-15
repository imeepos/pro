import React from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { cn } from "@/utils";
import { useTheme } from "@/hooks/useTheme";
import { useWordCloudData } from "@/hooks/useChartData";

import { LoadingSpinner } from "@/components/ui";

// 注册词云图
import "echarts-wordcloud";

// 安全的颜色验证函数
const getSafeColor = (color: string | undefined, fallback: string = '#6b7280'): string => {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (!trimmed || !trimmed.match(/^#[0-9A-Fa-f]{6}$/)) return fallback;
  return trimmed;
};

interface WordCloudChartProps {
  title?: string;
  height?: number;
  className?: string;
  maxWords?: number;
}

const WordCloudChart: React.FC<WordCloudChartProps> = ({
  title = "关键词词云",
  height = 0,
  className,
  maxWords = 100,
}) => {
  const { isDark } = useTheme();
  const { data, loading, error, refetch } = useWordCloudData(maxWords);

  // 在所有条件检查之前计算option
  const option = React.useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    
    // 处理数据，限制词数量并按权重排序
    const processedData = data.slice(0, maxWords).map((item) => ({
      name: item.keyword,
      value: item.weight,
      textStyle: {
        color: getSafeColor(getSentimentColorHex(item.sentiment || "neutral")),
      },
    }));

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: isDark ? "#ffffff" : "#111827",
        },
        formatter: (params: any) => {
          const sentiment =
            data.find((d) => d.keyword === params.name)?.sentiment || "neutral" as const;
          const sentimentText =
            sentiment === "positive"
              ? "正面"
              : sentiment === "negative"
              ? "负面"
              : "中性";
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${
              params.name
            }</div>
            <div>权重: <span style="font-weight: bold;">${
              params.value
            }</span></div>
            <div>情感: <span style="color: ${getSentimentColorHex(
              sentiment
            )}; font-weight: bold;">${sentimentText}</span></div>
          `;
        },
      },
      series: [
        {
          type: "wordCloud",
          gridSize: 8,
          sizeRange: [12, 60],
          rotationRange: [-45, 45],
          rotationStep: 15,
          shape: "pentagon",
          width: "90%",
          height: "80%",
          left: "center",
          top: "center",
          drawOutOfBound: false,
          layoutAnimation: true,
          textStyle: {
            fontFamily: "Inter, sans-serif",
            fontWeight: "bold",
            color: "#6b7280", // 默认颜色，防止渐变错误
            emphasis: {
              shadowBlur: 10,
              shadowColor: "#333",
            },
          },
          emphasis: {
            focus: "self",
            textStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          data: processedData,
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data, title, maxWords, isDark]);

  // 获取情感对应的颜色（十六进制）
  function getSentimentColorHex(
    sentiment: "positive" | "negative" | "neutral"
  ): string {
    switch (sentiment) {
      case "positive":
        return "#10b981";
      case "negative":
        return "#ef4444";
      case "neutral":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  }

  // 如果正在加载，显示加载器
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <LoadingSpinner size="large" text="加载词云数据..." />
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
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-gray-500">暂无词云数据</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn("w-full h-full", className)}
    >
      {option ? (
        <ReactECharts
          option={option}
          style={{
            height: height ? `${height}px` : "100%",
            width: "100%",
          }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>暂无词云数据</p>
        </div>
      )}
    </motion.div>
  );
};

export default WordCloudChart;