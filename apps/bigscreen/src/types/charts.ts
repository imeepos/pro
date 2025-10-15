/**
 * 图表组件类型定义
 * 统一管理ECharts和图表相关的类型
 */

// ================== ECharts 基础类型 ==================

/**
 * ECharts 参数类型
 */
export interface EChartsParams {
  seriesIndex: number;
  dataIndex: number;
  value: number | string;
  name: string;
  color: string;
}

/**
 * ECharts 颜色回调参数
 */
export interface EChartsColorParams {
  dataIndex: number;
  seriesIndex?: number;
  value?: number | string;
  name?: string;
}

/**
 * ECharts 格式化回调参数
 */
export interface EChartsFormatterParams {
  seriesName: string;
  name: string;
  value: number | string;
  dataIndex: number;
  color: string;
  marker?: string;
}

/**
 * ECharts 标签格式化参数
 */
export interface EChartsLabelParams {
  value: number | string;
  name: string;
  percent?: number;
  dataIndex: number;
  color: string;
}

// ================== 数据模型类型 ==================

/**
 * 年龄分布数据
 */
export interface AgeDistributionData {
  age: string;
  value: number;
  percentage: number;
}

/**
 * 性别分布数据
 */
export interface GenderDistributionData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * 情感分析数据
 */
export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  timestamp?: string;
}

/**
 * 情感趋势数据
 */
export interface SentimentTrendData {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

/**
 * 地理位置数据
 */
export interface GeographicData {
  name: string;
  value: number;
  coordinates?: [number, number];
}

/**
 * 热点话题数据
 */
export interface HotTopicData {
  keyword: string;
  count: number;
  weight: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * 事件类型数据
 */
export interface EventTypeData {
  type: string;
  count: number;
  percentage: number;
  color?: string;
}

/**
 * 时间序列数据点
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

/**
 * 网络节点数据
 */
export interface NetworkNodeData {
  id: string;
  name: string;
  value: number;
  category?: string;
  influence?: number;
}

/**
 * 网络边数据
 */
export interface NetworkEdgeData {
  source: string;
  target: string;
  value?: number;
  weight?: number;
}

// ================== 图表配置类型 ==================

/**
 * 主题配置
 */
export interface ChartTheme {
  isDark: boolean;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  colors: string[];
}

/**
 * 图表基础属性
 */
export interface BaseChartProps {
  height?: number;
  width?: number;
  className?: string;
  theme?: ChartTheme;
  loading?: boolean;
  onDataUpdate?: (data: unknown) => void;
}

/**
 * 饼图特有属性
 */
export interface PieChartProps extends BaseChartProps {
  data: { name: string; value: number }[];
  showLegend?: boolean;
  radius?: string | [string, string];
  labelFormatter?: (params: EChartsLabelParams) => string;
}

/**
 * 柱状图特有属性
 */
export interface BarChartProps extends BaseChartProps {
  data: { name: string; value: number }[];
  xAxisData: string[];
  yAxisFormatter?: (value: number) => string;
  colorCallback?: (params: EChartsColorParams) => string;
}

/**
 * 折线图特有属性
 */
export interface LineChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[];
  smooth?: boolean;
  showArea?: boolean;
  yAxisFormatter?: (value: number) => string;
}

/**
 * 词云图特有属性
 */
export interface WordCloudProps extends BaseChartProps {
  data: HotTopicData[];
  maxWords?: number;
  minFontSize?: number;
  maxFontSize?: number;
  colorScheme?: string[];
}

/**
 * 地图特有属性
 */
export interface MapChartProps extends BaseChartProps {
  data: GeographicData[];
  mapType?: 'china' | 'world';
  visualMapConfig?: {
    min: number;
    max: number;
    calculable?: boolean;
  };
}

/**
 * 网络图特有属性
 */
export interface NetworkChartProps extends BaseChartProps {
  nodes: NetworkNodeData[];
  edges: NetworkEdgeData[];
  layout?: 'force' | 'circular' | 'none';
  roam?: boolean;
}

// ================== 工具函数类型 ==================

/**
 * 颜色生成函数类型
 */
export type ColorGenerator = (index: number, total: number) => string;

/**
 * 数据格式化函数类型
 */
export type DataFormatter<T> = (data: T[]) => unknown;

/**
 * 图表事件处理函数类型
 */
export type ChartEventHandler = (params: EChartsParams) => void;

// ================== 类型守卫函数 ==================

/**
 * 检查是否为有效的ECharts参数
 */
export function isValidEChartsParams(obj: unknown): obj is EChartsParams {
  if (!obj || typeof obj !== 'object') return false;
  
  const params = obj as Record<string, unknown>;
  
  return (
    typeof params.seriesIndex === 'number' &&
    typeof params.dataIndex === 'number' &&
    (typeof params.value === 'number' || typeof params.value === 'string') &&
    typeof params.name === 'string'
  );
}

/**
 * 检查是否为有效的时间序列数据
 */
export function isValidTimeSeriesData(obj: unknown): obj is TimeSeriesDataPoint {
  if (!obj || typeof obj !== 'object') return false;
  
  const data = obj as Record<string, unknown>;
  
  return (
    typeof data.timestamp === 'string' &&
    typeof data.value === 'number'
  );
}

// ================== 常用常量 ==================

/**
 * 默认颜色调色板
 */
export const DEFAULT_COLORS = [
  '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff',
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
  '#10b981', '#34d399', '#6ee7b7', '#9deccd', '#a7f3d0',
  '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'
];

/**
 * 主题相关常量
 */
export const CHART_THEMES = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#374151',
    gridColor: '#e5e7eb',
    colors: DEFAULT_COLORS
  },
  dark: {
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    gridColor: '#374151',
    colors: DEFAULT_COLORS
  }
} as const;

/**
 * 图表尺寸常量
 */
export const CHART_SIZES = {
  small: { height: 200, width: 300 },
  medium: { height: 300, width: 400 },
  large: { height: 400, width: 600 },
  xlarge: { height: 500, width: 800 }
} as const;