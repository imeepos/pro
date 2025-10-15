import React from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { HotTopic } from "@/types";
import { cn, formatNumber } from "@/utils";


interface HotTopicsChartProps {
  data: HotTopic[];
  title?: string;
  height?: number;
  className?: string;
  maxTopics?: number;
  orientation?: "horizontal" | "vertical";
}

const HotTopicsChart: React.FC<HotTopicsChartProps> = ({
  data,
  title = "热点话题排行",
  height = 0,
  className,
  maxTopics = 10,
  orientation = "horizontal",
}) => {
  const option = React.useMemo(() => {
    // Return null if no valid data to prevent gradient rendering errors
    if (!Array.isArray(data) || data.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#6b7280',
            fontSize: 14
          }
        }
      };
    }

    // 处理数据，按热度排序并限制数量
    const processedData = data
      .slice(0, maxTopics)
      .sort((a, b) => b.count - a.count);

    const topics = processedData.map((item) => item.title);
    const counts = processedData.map((item) => item.count);
    const colors = processedData.map((item) =>
      getSentimentColorHex(item.sentiment || 'neutral')
    );

    const isHorizontal = orientation === "horizontal";

    return {
      title: {
        text: title,
        left: "center",
        top: 20,
        textStyle: {
          color: "#ffffff",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        formatter: (params: any) => {
          const param = params[0];
          const topic = processedData[param.dataIndex];
          const trendIcon =
            topic.trend === "up" ? "↗" : topic.trend === "down" ? "↘" : "→";
          const sentimentText =
            topic.sentiment === "positive"
              ? "正面"
              : topic.sentiment === "negative"
              ? "负面"
              : "中性";

          return `
            <div style="font-weight: bold; margin-bottom: 8px; max-width: 200px; word-wrap: break-word;">
              ${topic.title}
            </div>
            <div style="margin-bottom: 4px;">
              热度: <span style="font-weight: bold;">${formatNumber(
                param.value
              )}</span>
            </div>
            <div style="margin-bottom: 4px;">
              趋势: <span style="color: ${getTrendColorHex(
                topic.trend
              )};">${trendIcon} ${
            topic.trend === "up"
              ? "上升"
              : topic.trend === "down"
              ? "下降"
              : "稳定"
          }</span>
            </div>
            <div>
              情感: <span style="color: ${getSentimentColorHex(
                topic.sentiment || 'neutral'
              )}; font-weight: bold;">${sentimentText}</span>
            </div>
          `;
        },
      },
      grid: {
        left: isHorizontal ? "15%" : "3%",
        right: "4%",
        bottom: "3%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: isHorizontal ? "value" : "category",
        data: isHorizontal ? undefined : topics,
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.3)",
          },
        },
        axisLabel: {
          color: "#ffffff",
          interval: 0,
          rotate: isHorizontal ? 0 : 45,
          formatter: (value: string) => {
            if (isHorizontal) return formatNumber(parseInt(value));
            return value.length > 8 ? value.substring(0, 8) + "..." : value;
          },
        },
        splitLine: {
          show: isHorizontal,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.1)",
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: isHorizontal ? "category" : "value",
        data: isHorizontal ? topics : undefined,
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.3)",
          },
        },
        axisLabel: {
          color: "#ffffff",
          formatter: (value: string | number) => {
            if (typeof value === "string") {
              return value.length > 12 ? value.substring(0, 12) + "..." : value;
            }
            return formatNumber(value);
          },
        },
        splitLine: {
          show: !isHorizontal,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.1)",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "热度",
          type: "bar",
          data: counts.map((count, index) => ({
            value: count,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: isHorizontal ? 1 : 0,
                y2: isHorizontal ? 0 : 1,
                colorStops: [
                  { offset: 0, color: colors[index] || "#6b7280" },
                  {
                    offset: 1,
                    color: adjustColorBrightness(colors[index] || "#6b7280", -20),
                  },
                ],
              },
              borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
            },
          })),
          barWidth: "60%",
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          animationDelay: (idx: number) => idx * 100,
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data, title, maxTopics, orientation]);

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

  // 获取趋势对应的颜色（十六进制）
  function getTrendColorHex(trend: "up" | "down" | "stable"): string {
    switch (trend) {
      case "up":
        return "#10b981";
      case "down":
        return "#ef4444";
      case "stable":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  }

  // 调整颜色亮度
  function adjustColorBrightness(color: string, amount: number): string {
    // Handle invalid or undefined colors
    if (!color || typeof color !== 'string' || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return "#6b7280"; // fallback color
    }
    
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    
    // Check if parsing was successful
    if (isNaN(num)) {
      return "#6b7280"; // fallback color
    }
    
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (
      (usePound ? "#" : "") +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn("chart-container", className)}
    >
      {option ? (
        <ReactECharts
          option={option}
          style={{ height: height ? `${height}px` : `100%`, width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          暂无热点话题数据
        </div>
      )}
    </motion.div>
  );
};

export default HotTopicsChart;
