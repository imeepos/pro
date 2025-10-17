import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EventsAPI } from '@/services/api';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  Heart,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Target,
  Minus,
  Globe,
  Network,
  Clock
} from 'lucide-react';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@/utils/logger';
// import { generateTrendData } from '@/mock/mockData'; // 移除直接导入
import MetricCard from '@/components/ui/MetricCard';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import WordCloudChart from '@/components/charts/WordCloudChart';
import GeographicChart from '@/components/charts/GeographicChart';
import PropagationPathChart from '@/components/charts/PropagationPathChart';
import EventTimelineChart from '@/components/charts/EventTimelineChart';
import EventDevelopmentChart from '@/components/charts/EventDevelopmentChart';
import InfluenceNetworkFlow from '@/components/charts/InfluenceNetworkFlow';

// 时间序列数据接口
interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  positive: number;
  negative: number;
  neutral: number;
}

// 趋势图表数据接口
interface TrendChartData {
  hotnessData: number[];
  sentimentData: number[];
  postData: number[];
  userData: number[];
}

// 影响力用户接口
interface InfluenceUser {
  id: string;
  name: string;
  type: string;
  influence: number;
  followers: string;
  posts: number;
  engagement: string;
}

// 地理分布数据接口
interface GeographicDataPoint {
  region: string;
  posts: number;
  users: number;
  sentiment: number;
}

interface EventDetailData {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  // 详细分析数据
  timeline: Array<{
    time: string;
    event: string;
    type: 'start' | 'peak' | 'decline' | 'key_event' | 'milestone';
    impact: number;
    description: string;
    metrics: { posts: number, users: number, sentiment: number }
  }>;
  propagationPath: Array<{
    userType: string;
    userCount: number;
    postCount: number;
    influence: number;
  }>;
  keyNodes: Array<{
    time: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    metrics: {
      posts: number;
      users: number;
      sentiment: number;
    };
  }>;
  developmentPhases: Array<{
    phase: string;
    timeRange: string;
    description: string;
    keyEvents: string[];
    keyTasks: string[];
    keyMeasures: string[];
    metrics: {
      hotness: number;
      posts: number;
      users: number;
      sentiment: number;
    };
    status: 'completed' | 'ongoing' | 'planned';
  }>;
}

const logger = createLogger('EventDetail');

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendChartData | null>(null);
  const [influenceUsers, setInfluenceUsers] = useState<InfluenceUser[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicDataPoint[]>([]);
  type EventTab = 'overview' | 'timeline' | 'propagation' | 'analysis' | 'development';
  const [activeTab, setActiveTab] = useState<EventTab>('overview');
  const sentimentLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
  const toSentimentLevel = (value: number) => {
    const normalized = Math.round(value / 10);
    const index = Math.min(sentimentLevels.length - 1, Math.max(0, normalized - 1));
    return sentimentLevels[index];
  };
  const tabs: ReadonlyArray<{ id: EventTab; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: '概览分析', icon: BarChart3 },
    { id: 'timeline', label: '发展时间线', icon: Clock },
    { id: 'propagation', label: '传播路径', icon: Network },
    { id: 'development', label: '发展路径', icon: Activity },
    { id: 'analysis', label: '深度分析', icon: Target }
  ];

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        navigate('/events');
        return;
      }

      try {
        // 获取事件详情数据
        const eventData = await EventsAPI.getEventDetail(eventId);
        // 转换为 EventDetailData 格式
        const convertedEventData: EventDetailData = {
          id: eventData.id,
          title: eventData.title,
          description: eventData.description || '',
          postCount: eventData.postCount,
          userCount: eventData.userCount,
          sentiment: eventData.sentiment,
          hotness: eventData.hotness,
          trend: eventData.trend,
          category: eventData.category,
          keywords: eventData.keywords,
          createdAt: eventData.createdAt,
          lastUpdate: eventData.lastUpdate,
          timeline: [], // Mock data for now
          propagationPath: [], // Mock data for now
          keyNodes: [], // Mock data for now
          developmentPhases: [] // Mock data for now
        };
        setEventData(convertedEventData);

        // 获取时间序列数据
        const timeSeriesData = await EventsAPI.getEventTimeSeries(eventId);
        // 转换为 TimeSeriesDataPoint 格式
        const convertedTimeSeries: TimeSeriesDataPoint[] = timeSeriesData.map(item => ({
          timestamp: item.timestamp,
          value: item.posts + item.users + item.interactions,
          positive: 0, // Mock data
          negative: 0, // Mock data
          neutral: 0 // Mock data
        }));
        setTimeSeriesData(convertedTimeSeries);

        // 获取趋势数据
        const trendData = await EventsAPI.getEventTrends(eventId);
        // 转换为 TrendChartData 格式
        const convertedTrendData: TrendChartData = {
          hotnessData: [], // Mock data
          sentimentData: trendData.sentimentScores || [],
          postData: trendData.postVolume || [],
          userData: trendData.userEngagement || []
        };
        setTrendData(convertedTrendData);

        // 获取影响力用户数据
        const influenceUsersData = await EventsAPI.getInfluenceUsers(eventId);
        // 转换为页面期望的 InfluenceUser 格式
        const convertedInfluenceUsers: InfluenceUser[] = influenceUsersData.map(user => ({
          id: user.userId,
          name: user.username,
          type: 'user', // 默认值
          influence: user.influence,
          followers: user.followers.toString(),
          posts: user.postCount,
          engagement: user.interactionCount.toString()
        }));
        setInfluenceUsers(convertedInfluenceUsers);

        // 获取地理分布数据
        const geographicData = await EventsAPI.getGeographic(eventId);
        // 转换为 GeographicDataPoint 格式
        const convertedGeographicData: GeographicDataPoint[] = geographicData.map(item => ({
          region: item.region,
          posts: 0, // Mock data
          users: item.count,
          sentiment: 0.5 // Mock data
        }));
        setGeographicData(convertedGeographicData);
      } catch (error) {
        logger.error('Failed to fetch event data:', error);
      }
    };

    fetchEventData();
  }, [eventId]);



  const getTrendIcon = (trend: EventDetailData['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  // 使用从 API 获取的趋势数据
  const trendChartData = useMemo<TrendChartData>(() => {
    if (!trendData) {
      return {
        hotnessData: [],
        sentimentData: [],
        postData: [],
        userData: []
      };
    }
    return trendData;
  }, [trendData]);
  
  const { hotnessData, sentimentData, postData, userData } = trendChartData;

  
  if (!eventData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }
  return (
    <div className="space-y-8 p-6">
      {/* 页面标题和返回按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/event-analysis')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="dashboard-title text-foreground flex items-center">
              <div className="w-1 h-10 bg-gradient-to-b from-primary via-primary to-primary/30 rounded-full mr-4"></div>
              事件详情分析
            </h1>
            <p className="text-muted-foreground mt-1">
              深度分析事件发展轨迹和传播路径
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          最后更新: {formatRelativeTime(eventData.lastUpdate)}
        </div>
      </div>

      {/* 事件基本信息 */}
      <div className="glass-card p-8 sentiment-overview-card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <h2 className="text-2xl font-bold text-foreground">{eventData.title}</h2>
              <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">
                {eventData.category}
              </span>
              {getTrendIcon(eventData.trend)}
              {eventData.hotness >= 90 && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  高热度事件
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-lg mb-4">{eventData.description}</p>
            <div className="flex flex-wrap gap-2">
              {eventData.keywords.map(keyword => (
                <span key={keyword} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                  #{keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-foreground mb-2">{eventData.hotness}</div>
            <div className="text-muted-foreground">热度指数</div>
          </div>
        </div>
      </div>

      {/* 核心统计指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="贴子数量"
          className='sentiment-overview-card'
          value={eventData.postCount}
          change={25.3}
          icon="MessageSquare"
          color="sentiment-positive"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={postData} color="#10b981" type="bar" />}
        />
        <MetricCard
          title="参与用户"
          className='sentiment-overview-card'
          value={eventData.userCount}
          change={18.7}
          icon="Users"
          color="purple"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={userData} color="#8b5cf6" type="line" />}
        />
        <MetricCard
          title="热度趋势"
          className='sentiment-overview-card'
          value={eventData.hotness}
          change={15.2}
          icon="Zap"
          color="sentiment-negative"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={hotnessData} color="#ef4444" type="line" />}
        />
        <MetricCard
          title="情感指数"
          className='sentiment-overview-card'
          value={eventData.sentiment.positive}
          change={8.5}
          icon="Heart"
          color="sentiment-positive"
          size="large"
          showChart={true}
          sentiment={{
            type: 'positive',
            level: toSentimentLevel(eventData.sentiment.positive)
          }}
          chartComponent={<MiniTrendChart data={sentimentData.map((v: number) => v * 100)} color="#10b981" type="line" />}
        />
      </div>

      {/* 标签页导航 */}
      <div className="glass-card sentiment-overview-card">
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >

              {/* 趋势图表 */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-foreground mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  热度趋势分析
                </h3>
                <TimeSeriesChart
                  data={timeSeriesData}
                  title=""
                  height={300}
                />
              </div>

              {/* 图表分析区域 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 关键词分析 */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-foreground mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    关键词热度
                  </h3>
                  <WordCloudChart
                    title=""
                    height={250}
                    maxWords={20}
                  />
                </div>

                {/* 地理分布分析 */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-foreground mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    地理分布
                  </h3>
                  <GeographicChart />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <EventTimelineChart data={eventData.timeline} />
            </motion.div>
          )}

          {activeTab === 'propagation' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <PropagationPathChart data={eventData.propagationPath} />

              {/* 影响力用户网络 */}
              <div className="bg-muted/20 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  用户影响力排名
                </h4>
                {/* 影响力网络图 */}
                <InfluenceNetworkFlow
                  users={influenceUsers}
                />
              </div>

              {/* 地理传播分析 */}
              <div className="bg-muted/20 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  地理传播分析
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <GeographicChart />
                  </div>
                  <div className="space-y-4">
                    <h5 className="font-medium text-foreground">传播热点地区</h5>
                    <div className="space-y-3">
                      {geographicData.map((region: GeographicDataPoint, index: number) => (
                        <div key={region.region} className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-primary">#{index + 1}</span>
                            <span className="text-foreground">{region.region}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-muted-foreground">{region.posts.toLocaleString()} 贴子</span>
                            <span className="text-muted-foreground">{region.users.toLocaleString()} 用户</span>
                            <span className={cn(
                              'font-semibold',
                              region.sentiment > 0.6 ? 'text-green-400' :
                                region.sentiment < 0.4 ? 'text-red-400' : 'text-yellow-400'
                            )}>
                              {(region.sentiment * 100).toFixed(0)}% 正面
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'development' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <EventDevelopmentChart phases={eventData.developmentPhases} />
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* 关键节点分析 */}
              <div className="bg-muted/20 rounded-lg p-6">
                <h3 className="text-foreground mb-6 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  关键节点分析
                </h3>

                <div className="space-y-4">
                  {eventData.keyNodes.map((node, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card/50 border border-border/50 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                              {node.time}
                            </span>
                            <span className={cn(
                              'px-2 py-1 text-xs rounded-full font-medium',
                              node.impact === 'high' && 'bg-red-500/20 text-red-400',
                              node.impact === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                              node.impact === 'low' && 'bg-green-500/20 text-green-400'
                            )}>
                              {node.impact === 'high' ? '高影响' : node.impact === 'medium' ? '中影响' : '低影响'}
                            </span>
                          </div>
                          <p className="text-foreground mb-4 text-base">{node.description}</p>
                          <div className="flex items-center space-x-8 text-sm">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground font-semibold">{formatNumber(node.metrics.posts)}</span>
                              <span className="text-muted-foreground">贴子</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground font-semibold">{formatNumber(node.metrics.users)}</span>
                              <span className="text-muted-foreground">用户</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Heart className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground font-semibold">{(node.metrics.sentiment * 100).toFixed(1)}%</span>
                              <span className="text-muted-foreground">正面情感</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 深度分析洞察 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-muted/20 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    事件发展模式
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">爆发速度</span>
                      <span className="text-green-400 font-semibold">快速</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">传播范围</span>
                      <span className="text-blue-400 font-semibold">广泛</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">持续时间</span>
                      <span className="text-yellow-400 font-semibold">中等</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                      <span className="text-foreground">影响深度</span>
                      <span className="text-red-400 font-semibold">深度</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    关键成功因素
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-foreground font-medium">官方及时回应</div>
                        <div className="text-muted-foreground text-sm">工作室快速发声，控制舆论走向</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-foreground font-medium">粉丝群体活跃</div>
                        <div className="text-muted-foreground text-sm">粉丝积极参与讨论，推高话题热度</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-foreground font-medium">媒体跟进报道</div>
                        <div className="text-muted-foreground text-sm">主流媒体关注，扩大传播影响</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
