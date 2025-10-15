import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import MetricCard from './MetricCard';
import MiniTrendChart from '@/components/charts/MiniTrendChart';

interface StatsData {
  events: { value: number; change: number };
  posts: { value: number; change: number };
  users: { value: number; change: number };
  interactions: { value: number; change: number };
}

interface StatsOverviewProps {
  data: StatsData;
  loading?: boolean;
  className?: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  data,
  loading = false,
  className = ''
}) => {
  const formatValue = (value: number): number => {
    if (value >= 1000) {
      return Math.round(value / 100) / 10; // 转换为 K 单位，保留一位小数
    }
    return value;
  };

  // 使用静态趋势数据
  const trendData = useMemo(() => ({
    eventTrendData: [120, 145, 180, 165, 190, 175, 200],
    postTrendData: [1200, 1450, 1800, 1650, 1900, 1750, 2000],
    userTrendData: [680, 720, 850, 780, 920, 860, 950],
    interactionTrendData: [3200, 3800, 4500, 4200, 4800, 4600, 5000]
  }), []);
  
  const { eventTrendData, postTrendData, userTrendData, interactionTrendData } = trendData;


  return (
    <div className={`grid grid-cols-2 grid-rows-2 h-full w-full gap-2 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <MetricCard
          title="事件数"
          value={formatValue(data.events.value)}
          change={data.events.change}
          icon="FileText"
          color="blue"
          loading={loading}
          size="tiny"
          showChart={true}
          chartComponent={<MiniTrendChart data={eventTrendData} color="#3b82f6" type="line" height={20} />}
          className="relative h-full"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MetricCard
          title="贴子数"
          value={formatValue(data.posts.value)}
          change={data.posts.change}
          icon="MessageCircle"
          color="green"
          loading={loading}
          size="tiny"
          showChart={true}
          chartComponent={<MiniTrendChart data={postTrendData} color="#10b981" type="line" height={20} />}
          className="relative h-full"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MetricCard
          title="用户数量"
          value={data.users.value}
          change={data.users.change}
          icon="Users"
          color="purple"
          loading={loading}
          size="tiny"
          showChart={true}
          chartComponent={<MiniTrendChart data={userTrendData} color="#8b5cf6" type="line" height={20} />}
          className="relative h-full"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <MetricCard
          title="互动数"
          value={formatValue(data.interactions.value)}
          change={data.interactions.change}
          icon="ThumbsUp"
          color="red"
          loading={loading}
          size="tiny"
          showChart={true}
          chartComponent={<MiniTrendChart data={interactionTrendData} color="#ef4444" type="line" height={20} />}
          className="relative h-full"
        />
      </motion.div>
    </div>
  );
};

export default StatsOverview;