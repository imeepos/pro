import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

interface WordCloudChartProps {
  className?: string;
}

const SimpleWordCloudChart: React.FC<WordCloudChartProps> = ({
  className = "",
}) => {
  // 模拟词云数据
  const mockWords = [
    { text: "热点", size: 32, color: "#ef4444" },
    { text: "讨论", size: 28, color: "#f97316" },
    { text: "关注", size: 24, color: "#f59e0b" },
    { text: "分析", size: 20, color: "#84cc16" },
    { text: "数据", size: 18, color: "#22c55e" },
    { text: "趋势", size: 16, color: "#10b981" },
    { text: "用户", size: 14, color: "#14b8a6" },
    { text: "内容", size: 12, color: "#06b6d4" },
    { text: "平台", size: 10, color: "#0ea5e9" },
    { text: "社交", size: 8, color: "#3b82f6" },
    { text: "媒体", size: 6, color: "#6366f1" },
    { text: "网络", size: 4, color: "#8b5cf6" },
    { text: "信息", size: 16, color: "#a855f7" },
    { text: "传播", size: 14, color: "#c084fc" },
    { text: "影响", size: 12, color: "#d8b4fe" },
    { text: "观点", size: 10, color: "#e9d5ff" },
    { text: "评论", size: 22, color: "#ec4899" },
    { text: "互动", size: 18, color: "#f472b6" },
    { text: "分享", size: 15, color: "#fb7185" },
    { text: "点赞", size: 13, color: "#fda4af" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("relative overflow-hidden", className)}
      style={{ height: `100%` }}
    >
      <div className="absolute inset-0 flex flex-wrap items-center justify-center p-4">
        {mockWords.map((word, index) => (
          <motion.span
            key={word.text}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.1,
              duration: 0.5,
              type: "spring",
              stiffness: 100,
            }}
            className="inline-block m-1 font-bold cursor-pointer hover:scale-110 transition-transform"
            style={{
              fontSize: `${word.size}px`,
              color: word.color || '#6b7280',
              textShadow: "0 0 10px rgba(0,0,0,0.3)",
            }}
          >
            {word.text}
          </motion.span>
        ))}
      </div>

      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 left-3/4 w-20 h-20 bg-green-500/5 rounded-full blur-xl"></div>
      </div>
    </motion.div>
  );
};

export default SimpleWordCloudChart;
