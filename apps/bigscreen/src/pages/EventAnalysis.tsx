import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  MessageSquare,
  Users,
  Heart,
  Eye,
  AlertTriangle,
  BarChart3,
  Clock
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@/utils/logger';
import MetricCard from '@/components/ui/MetricCard';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import { EventItem, TrendData } from '@/types';
import { EventsAPI } from '@/services/api';


const logger = createLogger('EventAnalysis');

const EventAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [eventsResult, categoriesResult, trendsResult] = await Promise.all([
          EventsAPI.getEventsList(),
          EventsAPI.getCategories(),
          EventsAPI.getTrendData()
        ]);
        
        setEvents(eventsResult || []);
        // 转换 EventCategory[] 为 string[]
        const categoryNames = ['all', ...(categoriesResult || []).map(cat => cat.name)];
        setCategories(categoryNames);
        setTrendData(trendsResult || null);
      } catch (error) {
        logger.error('Failed to load events data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredEvents = (events || []).filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSentimentColor = (sentiment: EventItem['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'text-success';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'text-destructive';
    }
    return 'text-muted-foreground';
  };

  const getTrendIcon = (trend: EventItem['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
    }
  };

  // 计算统计数据
  const totalEvents = filteredEvents.length;
  const totalPosts = filteredEvents.reduce((sum, event) => sum + event.postCount, 0);
  const totalUsers = filteredEvents.reduce((sum, event) => sum + event.userCount, 0);
  const avgHotness = filteredEvents.length > 0 ?
    Math.round(filteredEvents.reduce((sum, event) => sum + event.hotness, 0) / filteredEvents.length) : 0;

  // 从 mock 服务获取趋势数据
  const eventTrendData = trendData?.eventTrendData || [];
  const postTrendData = trendData?.postTrendData || [];
  const userTrendData = trendData?.userTrendData || [];
  const hotnessTrendData = trendData?.hotnessData || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const handleEventClick = (eventId: string) => {
    navigate(`/event-analysis/${eventId}`);
  };

  return (
    <div className="space-y-8 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="dashboard-title text-foreground flex items-center">
          <div className="w-1 h-10 bg-gradient-to-b from-primary via-primary to-primary/30 rounded-full mr-4"></div>
          事件分析
        </h1>
        <div className="text-sm text-muted-foreground">
          实时更新 · {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="事件总数"
          className='sentiment-overview-card'
          value={totalEvents}
          change={12.5}
          icon="Activity"
          color="sentiment-neutral"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={eventTrendData} color="#3b82f6" type="bar" />}
        />
        <MetricCard
          title="贴子总数"
          className='sentiment-overview-card'
          value={totalPosts}
          change={8.3}
          icon="MessageSquare"
          color="sentiment-positive"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={postTrendData} color="#10b981" type="line" />}
        />
        <MetricCard
          title="参与用户"
          className='sentiment-overview-card'
          value={totalUsers}
          change={5.7}
          icon="Users"
          color="purple"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={userTrendData} color="#8b5cf6" type="line" />}
        />
        <MetricCard
          title="平均热度"
          className='sentiment-overview-card'
          value={avgHotness}
          change={15.2}
          icon="Zap"
          color="sentiment-negative"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={hotnessTrendData} color="#ef4444" type="bar" />}
        />
      </div>

      {/* 搜索和筛选区域 */}
      <div className="glass-card p-6 sentiment-overview-card">
        <h3 className="text-foreground mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2" />
          事件筛选
        </h3>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-muted-foreground">
            当前时间区间: {selectedTimeRange} | 共找到 {filteredEvents.length} 个事件
          </div>

          <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索事件或关键词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* 分类筛选 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {(categories || []).map(category => (
              <option key={category} value={category} className="bg-card text-foreground">
                {category === 'all' ? '全部分类' : category}
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="grid grid-cols-1 gap-6">
        {filteredEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-8 hover:bg-card/90 transition-all duration-300 cursor-pointer border-l-4 border-l-primary/50 hover:border-l-primary"
            onClick={() => handleEventClick(event.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                  <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">
                    {event.category}
                  </span>
                  {getTrendIcon(event.trend)}
                  {/* 热度等级指示器 */}
                  {event.hotness >= 90 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      高热度
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground mb-6 text-base">{event.description}</p>

                <div className="flex items-center space-x-8 text-base">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-semibold">{formatNumber(event.postCount)}</span>
                    <span className="text-muted-foreground">贴子</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-semibold">{formatNumber(event.userCount)}</span>
                    <span className="text-muted-foreground">用户</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-semibold">{event.hotness}</span>
                    <span className="text-muted-foreground">热度</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Heart className={cn('w-5 h-5', getSentimentColor(event.sentiment))} />
                    <span className={cn('font-semibold', getSentimentColor(event.sentiment))}>
                      {event.sentiment.positive > event.sentiment.negative ? '正面' :
                       event.sentiment.negative > event.sentiment.positive ? '负面' : '中性'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatRelativeTime(event.lastUpdate)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div className="flex flex-wrap gap-2">
                    {event.keywords.slice(0, 6).map(keyword => (
                      <span key={keyword} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                        #{keyword}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event.id);
                    }}
                    className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>查看详情</span>
                  </button>
                </div>
              </div>

              <div className="ml-8 flex flex-col items-end space-y-4">
                <div className="text-right">
                  <div className="text-4xl font-bold text-foreground">{event.hotness}</div>
                  <div className="text-sm text-muted-foreground">热度指数</div>
                </div>

                {/* 热度直方图（简化版） */}
                <div className="w-20 h-12 bg-muted/30 rounded-lg flex items-end space-x-1 p-2">
                  {[...Array(7)].map((_, i) => {
                    const height = 20 + Math.random() * 60;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary/60 to-primary rounded-sm"
                        style={{ height: `${height}%` }}
                      ></div>
                    );
                  })}
                </div>

                {/* 情感指示器 */}
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    event.sentiment.positive > event.sentiment.negative ? 'bg-green-400' :
                    event.sentiment.negative > event.sentiment.positive ? 'bg-red-400' : 'bg-gray-400'
                  )}></div>
                  <span className="text-sm text-muted-foreground">
                    {event.sentiment.positive > event.sentiment.negative ? '正面主导' :
                     event.sentiment.negative > event.sentiment.positive ? '负面主导' : '中性'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 事件详情模态框 */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedEvent.description}</p>

              {/* 详细统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">贴子数量</div>
                  <div className="text-xl font-bold text-foreground">{formatNumber(selectedEvent.postCount)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">参与用户</div>
                  <div className="text-xl font-bold text-foreground">{formatNumber(selectedEvent.userCount)}</div>
                </div>
              </div>

              {/* 情感分析 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-3">情感分析</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-success">正面</span>
                    <span className="text-foreground">{selectedEvent.sentiment.positive}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-destructive">负面</span>
                    <span className="text-foreground">{selectedEvent.sentiment.negative}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">中性</span>
                    <span className="text-foreground">{selectedEvent.sentiment.neutral}%</span>
                  </div>
                </div>
              </div>

              {/* 关键词 */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">关键词</div>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.keywords.map(keyword => (
                    <span key={keyword} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default EventAnalysis;
