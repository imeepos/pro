import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  MessageSquare, 
  Heart,
  BarChart3,
  Eye
} from 'lucide-react';
import { cn, formatNumber } from '@/utils';
import { createLogger } from '@/utils/logger';
import { HotEvent } from '@/types';
import { EventsAPI } from '@/services/api';

interface HotEventsListProps {
  className?: string;
}

const logger = createLogger('HotEventsList');

const HotEventsList: React.FC<HotEventsListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotEvents = async () => {
      try {
        setLoading(true);
        const result = await EventsAPI.getHotList();
        // 确保返回的是数组
        if (Array.isArray(result)) {
          setEvents(result);
        } else {
          logger.warn('Hot events data is not an array:', result);
          setEvents([]);
        }
      } catch (error) {
        logger.error('Failed to fetch hot events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHotEvents();
  }, []);

  const getSentimentColor = (sentiment: HotEvent['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'text-success';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'text-destructive';
    }
    return 'text-muted-foreground';
  };

  const getSentimentLabel = (sentiment: HotEvent['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return '正面';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return '负面';
    }
    return '中性';
  };

  const getTrendIcon = (trend: HotEvent['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleEventClick = (eventId: string) => {
    // 跳转到事件分析页面
    navigate('/event-analysis', { state: { eventId } });
  };

  const renderMiniChart = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="flex items-end space-x-1 h-8 w-16">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-sm min-h-[2px]"
              style={{ height: `${Math.max(height, 10)}%` }}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Array.isArray(events) ? events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-muted/30 hover:bg-muted/50 border border-border rounded-lg p-2 cursor-pointer transition-all duration-300 hover:border-primary/50"
          onClick={() => handleEventClick(event.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-bold text-primary">#{index + 1}</span>
                <h4 className="text-sm font-medium text-foreground truncate">{event.title}</h4>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{formatNumber(event.postCount)}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Heart className={cn('w-3 h-3', getSentimentColor(event.sentiment))} />
                  <span className={getSentimentColor(event.sentiment)}>
                    {getSentimentLabel(event.sentiment)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>{event.hotness}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  {getTrendIcon(event.trend)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              {/* 热度直方图 */}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">7天热度</div>
                {renderMiniChart(event.trendData)}
              </div>
              
              {/* 热度指数 */}
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">{event.hotness}</div>
                <div className="text-xs text-muted-foreground">热度</div>
              </div>
              
              {/* 查看详情按钮 */}
              <button className="p-2 rounded-lg hover:bg-accent transition-colors group">
                <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )) : null}
    </div>
  );
};

export default HotEventsList;
