import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  RealTimeData, 
  SystemStatus, 
  DashboardConfig, 
  AppError,
  StatisticsData,
  HotTopic,
  KeywordData,
  TimeSeriesData,
  LocationData,
  SentimentData
} from '@/types';

interface AppState {
  // 数据状态
  realTimeData: RealTimeData | null;
  systemStatus: SystemStatus;
  dashboardConfig: DashboardConfig;
  
  // UI 状态
  isLoading: boolean;
  error: AppError | null;
  selectedTimeRange: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'halfYear' | 'lastHalfYear' | 'thisYear' | 'lastYear' | 'all';
  
  // WebSocket 状态
  isConnected: boolean;
  connectionRetries: number;
  
  // Actions
  setRealTimeData: (data: RealTimeData) => void;
  updateStatistics: (stats: StatisticsData) => void;
  updateHotTopics: (topics: HotTopic[]) => void;
  updateKeywords: (keywords: KeywordData[]) => void;
  updateTimeSeries: (series: TimeSeriesData[]) => void;
  updateLocations: (locations: LocationData[]) => void;
  addRecentPost: (post: SentimentData) => void;
  
  setSystemStatus: (status: SystemStatus) => void;
  setDashboardConfig: (config: Partial<DashboardConfig>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  setSelectedTimeRange: (range: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'halfYear' | 'lastHalfYear' | 'thisYear' | 'lastYear' | 'all') => void;
  setConnectionStatus: (connected: boolean) => void;
  incrementRetries: () => void;
  resetRetries: () => void;
  
  // 清理数据
  clearData: () => void;
  // 重置状态
  reset: () => void;
}

const initialSystemStatus: SystemStatus = {
  isOnline: false,
  lastUpdate: new Date().toISOString(),
  dataSource: {
    weibo: false,
    zhihu: false,
    news: false,
  },
  performance: {
    cpu: 0,
    memory: 0,
    network: 0,
  },
};

const initialDashboardConfig: DashboardConfig = {
  layout: 'grid',
  refreshInterval: 30000, // 30 seconds
  autoRefresh: true,
  theme: 'light', // 默认使用亮色主题
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, _get) => ({
    // 初始状态
    realTimeData: null,
    systemStatus: initialSystemStatus,
    dashboardConfig: initialDashboardConfig,
    isLoading: false,
    error: null,
    selectedTimeRange: 'today',
    isConnected: false,
    connectionRetries: 0,

    // Actions
    setRealTimeData: (data) => set({ realTimeData: data }),
    
    updateStatistics: (stats) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        statistics: stats,
      } : null,
    })),
    
    updateHotTopics: (topics) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        hotTopics: topics,
      } : null,
    })),
    
    updateKeywords: (keywords) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        keywords,
      } : null,
    })),
    
    updateTimeSeries: (series) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        timeSeries: series,
      } : null,
    })),
    
    updateLocations: (locations) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        locations,
      } : null,
    })),
    
    addRecentPost: (post) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        recentPosts: [post, ...state.realTimeData.recentPosts.slice(0, 49)], // 保持最新50条
      } : null,
    })),
    
    setSystemStatus: (status) => set({ systemStatus: status }),
    setDashboardConfig: (config) => set((state) => ({
      dashboardConfig: { ...state.dashboardConfig, ...config },
    })),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
    setConnectionStatus: (connected) => set({ isConnected: connected }),
    incrementRetries: () => set((state) => ({ connectionRetries: state.connectionRetries + 1 })),
    resetRetries: () => set({ connectionRetries: 0 }),
    
    clearData: () => set({
      realTimeData: null,
      error: null,
      isLoading: false,
    }),
    
    reset: () => set({
      realTimeData: null,
      systemStatus: initialSystemStatus,
      dashboardConfig: initialDashboardConfig,
      isLoading: false,
      error: null,
      selectedTimeRange: 'today',
      isConnected: false,
      connectionRetries: 0,
    }),
  }))
);
