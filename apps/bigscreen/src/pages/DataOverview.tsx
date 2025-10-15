import React, { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";

// 导入图表组件
import EventTypeBarChart from "@/components/charts/EventTypeBarChart";
import WordCloudChart from "@/components/charts/WordCloudChart";
import HotEventsList from "@/components/charts/HotEventsList";
import EmotionCurveChart from "@/components/charts/EmotionCurveChart";
import { StatsOverview, SentimentOverview } from "@/components/ui";
import { LocationHeatMap } from "@/components";
import { LocationData, OverviewStatisticsData } from "@/types";
import { OverviewAPI } from '@/services/api';
import { createLogger } from '@/utils';

const logger = createLogger('DataOverview');

const DataOverview: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [statsData, setStatsData] = useState<OverviewStatisticsData | null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statisticsResult, sentimentResult, locationsResult] = await Promise.all([
          OverviewAPI.getStatistics(selectedTimeRange),
          OverviewAPI.getSentiment(selectedTimeRange),
          OverviewAPI.getLocations(selectedTimeRange)
        ]);
        
        setStatsData(statisticsResult || null);
        setSentimentData(sentimentResult || null);
        // 转换 OverviewLocation 为 LocationData 格式
        const convertedLocations: LocationData[] = (locationsResult || []).map(loc => ({
          name: loc.region,
          value: loc.count,
          sentiment: 'neutral' as const, // 默认值
          coordinates: loc.coordinates || [0, 0]
        }));
        setLocationData(convertedLocations);
      } catch (error) {
        logger.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  // 构建 StatsOverview 组件的数据结构
  const statsOverviewData = statsData ? {
    events: { value: statsData.eventCount, change: statsData.eventCountChange },
    posts: { value: statsData.postCount, change: statsData.postCountChange },
    users: { value: statsData.userCount, change: statsData.userCountChange },
    interactions: {
      value: statsData.interactionCount,
      change: statsData.interactionCountChange,
    },
  } : null;

  if (loading || !statsData || !sentimentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden flex flex-col gap-2" 
         style={{ height: 'calc(100vh - 120px)' }}>
      {/* 主要布局：左中右结构 */}
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 
                      lg:gap-4 xl:gap-6 
                      sm:grid-cols-1 md:grid-cols-6 lg:grid-cols-12
                      overflow-hidden">
        {/* 左侧区域：占4列 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 
                        space-y-2 lg:space-y-3 xl:space-y-4
                        overflow-hidden">
          {/* 顶部4个指标卡片 */}
          <div className="glass-card sentiment-overview-card">
            <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">数据概览</h3>
            <div style={{ height: "calc(100% - 3rem)", overflow: "hidden" }}>
              <StatsOverview data={statsOverviewData!} />
            </div>
          </div>
          <div className="glass-card sentiment-overview-card">
            <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">事件榜单</h3>
            <div style={{ height: "calc(100% - 3rem)", overflow: "hidden" }}>
              <HotEventsList />
            </div>
          </div>
        </div>

        {/* 中间区域：占5列 - 主要地图区域 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 
                        glass-card p-2 lg:p-3 xl:p-4 sentiment-overview-card
                        overflow-hidden">
          <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">舆情地域分布</h3>
          <div className="h-full overflow-hidden" style={{ height: "calc(100% - 4rem)", minHeight: "400px" }}>
            <LocationHeatMap 
              data={locationData} 
              title="" 
              height="100%" 
            />
          </div>
        </div>

        {/* 右侧区域：占3列 - 情感分析 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 
                        space-y-2 lg:space-y-3 xl:space-y-4
                        overflow-hidden">
          <div className="glass-card sentiment-overview-card">
            <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">情感分析</h3>
            <div style={{ height: "calc(100% - 3rem)", overflow: "hidden" }}>
              <SentimentOverview data={sentimentData!} />
              <EmotionCurveChart height={218} />
            </div>
          </div>
        </div>
      </div>

      {/* 底部区域：3个模块 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 
                      gap-2 lg:gap-4 xl:gap-6 
                      flex-shrink-0 overflow-hidden"
                      style={{ height: 'clamp(240px, 35vh, 350px)' }}>
        {/* 热词分析 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">热词分析</h3>
          <div className="h-full overflow-hidden" style={{ height: "calc(100% - 4rem)" }}>
            <WordCloudChart
              title=""
              maxWords={50}
            />
          </div>
        </div>

        {/* 事件分析 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">事件分析</h3>
          <div className="h-full overflow-hidden" style={{ height: "calc(100% - 4rem)" }}>
            <HotEventsList />
          </div>
        </div>

        {/* 事件类型分布 */}
        <div className="glass-card sentiment-overview-card min-h-0 overflow-hidden">
          <h3 className="text-foreground p-2 lg:p-3 xl:p-4 text-sm lg:text-base">事件类型</h3>
          <div className="h-full overflow-hidden" style={{ height: "calc(100% - 4rem)" }}>
            <EventTypeBarChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverview;
