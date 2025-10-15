/**
 * 图表组件分类导出
 * 使用时请按需导入，例如：
 * import { TimeSeriesCharts } from '@/components/charts';
 * import { PieCharts } from '@/components/charts';
 */

// =========================== 分类导出 ===========================

// 时间序列和趋势图表
import TimeSeriesChart from './TimeSeriesChart';
import SentimentTrendChart from './SentimentTrendChart';
import MiniTrendChart from './MiniTrendChart';
import EmotionCurveChart from './EmotionCurveChart';

export const TimeSeriesCharts = {
  TimeSeriesChart,
  SentimentTrendChart,
  MiniTrendChart,
  EmotionCurveChart
};

// 饼图和分布图表
import SentimentPieChart from './SentimentPieChart';
import SimpleSentimentPieChart from './SimpleSentimentPieChart';
import EventTypePieChart from './EventTypePieChart';
import AgeDistributionChart from './AgeDistributionChart';
import GenderDistributionChart from './GenderDistributionChart';

export const PieCharts = {
  SentimentPieChart,
  SimpleSentimentPieChart,
  EventTypePieChart,
  AgeDistributionChart,
  GenderDistributionChart
};

// 柱状图和统计图表
import EventTypeBarChart from './EventTypeBarChart';
import EventCountChart from './EventCountChart';
import PostCountChart from './PostCountChart';

export const BarCharts = {
  EventTypeBarChart,
  EventCountChart,
  PostCountChart
};

// 词云和热点分析
import WordCloudChart from './WordCloudChart';
import SimpleWordCloudChart from './SimpleWordCloudChart';
import HotTopicsChart from './HotTopicsChart';

export const AnalysisCharts = {
  WordCloudChart,
  SimpleWordCloudChart,
  HotTopicsChart
};

// 地理和位置分析
import LocationHeatMap from './LocationHeatMap';
import GeographicChart from './GeographicChart';

export const GeographicCharts = {
  LocationHeatMap,
  GeographicChart
};

// 网络和关系图
import InfluenceNetworkFlow from './InfluenceNetworkFlow';
import SimpleNetworkFlow from './SimpleNetworkFlow';
import PropagationPathChart from './PropagationPathChart';

export const NetworkCharts = {
  InfluenceNetworkFlow,
  SimpleNetworkFlow,
  PropagationPathChart
};

// 事件分析
import HotEventsList from './HotEventsList';
import EventDevelopmentChart from './EventDevelopmentChart';
import EventTimelineChart from './EventTimelineChart';

export const EventCharts = {
  HotEventsList,
  EventDevelopmentChart,
  EventTimelineChart
};

// =========================== 单个导出（向后兼容） ===========================

// 时间序列和趋势图表
export { default as TimeSeriesChart } from './TimeSeriesChart';
export { default as SentimentTrendChart } from './SentimentTrendChart';
export { default as MiniTrendChart } from './MiniTrendChart';
export { default as EmotionCurveChart } from './EmotionCurveChart';

// 饼图和分布图表
export { default as SentimentPieChart } from './SentimentPieChart';
export { default as SimpleSentimentPieChart } from './SimpleSentimentPieChart';
export { default as EventTypePieChart } from './EventTypePieChart';
export { default as AgeDistributionChart } from './AgeDistributionChart';
export { default as GenderDistributionChart } from './GenderDistributionChart';

// 柱状图和统计图表
export { default as EventTypeBarChart } from './EventTypeBarChart';
export { default as EventCountChart } from './EventCountChart';
export { default as PostCountChart } from './PostCountChart';

// 词云和热点分析
export { default as WordCloudChart } from './WordCloudChart';
export { default as SimpleWordCloudChart } from './SimpleWordCloudChart';
export { default as HotTopicsChart } from './HotTopicsChart';

// 地理和位置分析
export { default as LocationHeatMap } from './LocationHeatMap';
export { default as GeographicChart } from './GeographicChart';

// 网络和关系图
export { default as InfluenceNetworkFlow } from './InfluenceNetworkFlow';
export { default as SimpleNetworkFlow } from './SimpleNetworkFlow';
export { default as PropagationPathChart } from './PropagationPathChart';

// 事件分析
export { default as HotEventsList } from './HotEventsList';
export { default as EventDevelopmentChart } from './EventDevelopmentChart';
export { default as EventTimelineChart } from './EventTimelineChart';
