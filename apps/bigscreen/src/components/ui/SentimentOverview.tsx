import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils';

interface SentimentData {
  positive: { value: number; change: number };
  negative: { value: number; change: number };
  neutral: { value: number; change: number };
}

interface SentimentOverviewProps {
  data: SentimentData;
  loading?: boolean;
  className?: string;
}

const SentimentOverview: React.FC<SentimentOverviewProps> = ({
  data,
  loading = false,
  className = ''
}) => {
  // 悬浮状态
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 检查数据有效性
  if (!data || !data.positive || !data.negative || !data.neutral) {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        <div className="text-center text-gray-500">暂无数据</div>
      </div>
    );
  }

  // 计算百分比
  const total = data.positive.value + data.negative.value + data.neutral.value;
  const positivePercent = Math.round((data.positive.value / total) * 100);
  const negativePercent = Math.round((data.negative.value / total) * 100);
  const neutralPercent = Math.round((data.neutral.value / total) * 100);

  // 计算角度
  const positiveAngle = positivePercent * 3.6;
  const negativeAngle = negativePercent * 3.6;
  // const neutralAngle = neutralPercent * 3.6; // Commented out unused variable

  // 计算鼠标悬浮的扇形
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    // 计算角度 (从12点方向开始，顺时针)
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    
    // 判断在哪个扇形
    if (angle <= positiveAngle) {
      setHoveredSegment('positive');
    } else if (angle <= positiveAngle + negativeAngle) {
      setHoveredSegment('negative');
    } else {
      setHoveredSegment('neutral');
    }
  };

  const SentimentItem = ({ 
    label, 
    value, 
    change, 
    color,
    segmentType
  }: { 
    label: string; 
    value: number; 
    change: number; 
    color: string;
    segmentType: string;
  }) => {
    const isPositiveChange = change >= 0;
    const ChangeIcon = isPositiveChange ? ArrowUp : ArrowDown;
    
    // 获取对应的背景色
    const getHoverBgColor = () => {
      if (segmentType === 'positive') return 'hover:bg-green-500/10';
      if (segmentType === 'negative') return 'hover:bg-red-500/10';
      if (segmentType === 'neutral') return 'hover:bg-blue-500/10';
      return '';
    };
    
    return (
      <div 
        className={cn(
          "flex flex-col space-y-1 cursor-pointer rounded p-2 transition-all duration-200 hover:scale-105",
          getHoverBgColor()
        )}
        onMouseEnter={() => setHoveredSegment(segmentType)}
        onMouseLeave={() => setHoveredSegment(null)}
      >
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-medium', color)}>{label}</span>
        </div>
        <div className={cn('text-lg font-bold', color)}>
          {value}
        </div>
        <div className="flex items-center space-x-1">
          <ChangeIcon className={cn(
            'w-3 h-3',
            isPositiveChange ? 'text-green-500' : 'text-red-500'
          )} />
          <span className={cn(
            'text-xs font-medium',
            isPositiveChange ? 'text-green-500' : 'text-red-500'
          )}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">vs 上期</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-gray-700 rounded w-12"></div>
              <div className="h-6 bg-gray-700 rounded w-8"></div>
              <div className="h-3 bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* 顶部三个指标 */}
      <div className="grid grid-cols-3 gap-4">
        <SentimentItem
          key="positive"
          label="正面情绪"
          value={data.positive.value}
          change={data.positive.change}
          color="text-green-500"
          segmentType="positive"
        />
        <SentimentItem
          key="negative"
          label="负面情绪"
          value={data.negative.value}
          change={data.negative.change}
          color="text-red-500"
          segmentType="negative"
        />
        <SentimentItem
          key="neutral"
          label="中性情绪"
          value={data.neutral.value}
          change={data.neutral.change}
          color="text-blue-500"
          segmentType="neutral"
        />
      </div>

      {/* 饼图区域 */}
      <div className="flex items-center justify-between">
        {/* 左侧：环状图和百分比 */}
        <div className="flex items-center space-x-3">
          {/* 环状图 */}
          <div className="w-28 h-28 relative flex-shrink-0">
            <div 
              className={cn(
                "w-full h-full rounded-full cursor-pointer transition-all duration-300",
                hoveredSegment ? 'scale-110' : 'scale-100'
              )}
              style={{
                background: `conic-gradient(
                  ${hoveredSegment === 'positive' ? '#22c55e' : hoveredSegment ? '#22c55e80' : '#22c55e'} 0deg ${positiveAngle}deg,
                  ${hoveredSegment === 'negative' ? '#ef4444' : hoveredSegment ? '#ef444480' : '#ef4444'} ${positiveAngle}deg ${positiveAngle + negativeAngle}deg,
                  ${hoveredSegment === 'neutral' ? '#3b82f6' : hoveredSegment ? '#3b82f680' : '#3b82f6'} ${positiveAngle + negativeAngle}deg 360deg
                )`
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* 中心空白 */}
              <div className="absolute inset-6 bg-background rounded-full pointer-events-none"></div>
              
              {/* 中心百分比显示 */}
              {hoveredSegment && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                    <span className={cn(
                      "text-sm font-bold",
                      hoveredSegment === 'positive' && 'text-green-500',
                      hoveredSegment === 'negative' && 'text-red-500',
                      hoveredSegment === 'neutral' && 'text-blue-500'
                    )}>
                      {hoveredSegment === 'positive' && `${positivePercent}%`}
                      {hoveredSegment === 'negative' && `${negativePercent}%`}
                      {hoveredSegment === 'neutral' && `${neutralPercent}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 百分比 */}
          <div className="space-y-1 text-xs">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-green-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('positive')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-500 font-medium">{positivePercent}%</span>
            </div>
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-red-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('negative')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-500 font-medium">{negativePercent}%</span>
            </div>
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-blue-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('neutral')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-500 font-medium">{neutralPercent}%</span>
            </div>
          </div>
        </div>

        {/* 右侧：文字标签 */}
        <div className="space-y-1 text-[10px] text-gray-500">
          <div 
            className="flex items-center space-x-1 cursor-pointer hover:bg-green-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('positive')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
            <span>正面</span>
          </div>
          <div 
            className="flex items-center space-x-1 cursor-pointer hover:bg-red-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('negative')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
            <span>负面</span>
          </div>
          <div 
            className="flex items-center space-x-1 cursor-pointer hover:bg-blue-500/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('neutral')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
            <span>中性</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentOverview;