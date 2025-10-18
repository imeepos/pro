import { Field, ID, InputType, ObjectType, Int, Float, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsEnum, IsDateString, Min, Max, IsArray, IsBoolean, IsEmail, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 增强的数据处理状态枚举
 */
export enum EnhancedProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

/**
 * 数据质量等级枚举
 */
export enum DataQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  XML = 'xml',
  PARQUET = 'parquet'
}

/**
 * 聚合粒度枚举
 */
export enum AggregationGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * 排序方向枚举
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * 数据源风险等级枚举
 */
export enum SourceRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 批量操作类型枚举
 */
export enum BatchOperationType {
  RETRY = 'retry',
  CANCEL = 'cancel',
  ARCHIVE = 'archive',
  DELETE = 'delete',
  UPDATE_STATUS = 'update_status',
  EXPORT = 'export'
}

// 注册GraphQL枚举
registerEnumType(EnhancedProcessingStatus, { name: 'EnhancedProcessingStatus' });
registerEnumType(DataQualityLevel, { name: 'DataQualityLevel' });
registerEnumType(ExportFormat, { name: 'ExportFormat' });
registerEnumType(AggregationGranularity, { name: 'AggregationGranularity' });
registerEnumType(SortDirection, { name: 'SortDirection' });
registerEnumType(SourceRiskLevel, { name: 'SourceRiskLevel' });
registerEnumType(BatchOperationType, { name: 'BatchOperationType' });

/**
 * 高级时间范围过滤器
 */
@InputType('AdvancedTimeRangeInput')
export class AdvancedTimeRangeFilter {
  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true, description: '开始时间' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Field(() => String, { nullable: true, description: '结束时间' })
  endDate?: string;

  @IsOptional()
  @IsEnum(AggregationGranularity)
  @Field(() => AggregationGranularity, { nullable: true, description: '时间聚合粒度' })
  granularity?: AggregationGranularity;

  @IsOptional()
  @Field(() => Int, { nullable: true, description: '时间偏移（分钟）' })
  offsetMinutes?: number;

  @IsOptional()
  @Field(() => String, { nullable: true, description: '时区' })
  timezone?: string;
}

/**
 * 增强的数据源过滤器
 */
@InputType('EnhancedSourceFilterInput')
export class EnhancedSourceFilter {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true, description: '数据源域名列表' })
  domains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true, description: 'URL模式列表' })
  urlPatterns?: string[];

  @IsOptional()
  @IsEnum(SourceRiskLevel)
  @Field(() => SourceRiskLevel, { nullable: true, description: '风险等级过滤' })
  riskLevel?: SourceRiskLevel;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否仅显示活跃源' })
  activeOnly?: boolean;

  @IsOptional()
  @Field(() => Int, { nullable: true, description: '最小更新频率（分钟）' })
  minUpdateFrequency?: number;

  @IsOptional()
  @Field(() => Int, { nullable: true, description: '最大失败率（百分比）' })
  maxFailureRate?: number;
}

/**
 * 排序配置
 */
@InputType('SortInput')
export class SortConfig {
  @IsString()
  @Field(() => String, { description: '排序字段' })
  field: string;

  @IsEnum(SortDirection)
  @Field(() => SortDirection, { description: '排序方向' })
  direction: SortDirection;
}

/**
 * 增强的原始数据查询过滤器
 */
@InputType('EnhancedRawDataFilterInput')
export class EnhancedRawDataFilter {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, description: '关键词搜索' })
  keyword?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EnhancedProcessingStatus, { each: true })
  @Field(() => [EnhancedProcessingStatus], { nullable: true, description: '处理状态列表' })
  statuses?: EnhancedProcessingStatus[];

  @IsOptional()
  @Type(() => AdvancedTimeRangeFilter)
  @Field(() => AdvancedTimeRangeFilter, { nullable: true, description: '高级时间范围' })
  timeRange?: AdvancedTimeRangeFilter;

  @IsOptional()
  @Type(() => EnhancedSourceFilter)
  @Field(() => EnhancedSourceFilter, { nullable: true, description: '增强数据源过滤' })
  sourceFilter?: EnhancedSourceFilter;

  @IsOptional()
  @IsArray()
  @IsEnum(DataQualityLevel, { each: true })
  @Field(() => [DataQualityLevel], { nullable: true, description: '数据质量等级列表' })
  qualityLevels?: DataQualityLevel[];

  @IsOptional()
  @IsArray()
  @Type(() => SortConfig)
  @Field(() => [SortConfig], { nullable: true, description: '排序配置' })
  sortBy?: SortConfig[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true, description: '页码' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @Field(() => Int, { nullable: true, description: '每页数量' })
  pageSize?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否包含已归档数据' })
  includeArchived?: boolean;

  @IsOptional()
  @Field(() => String, { nullable: true, description: '内容哈希' })
  contentHash?: string;
}

/**
 * 数据质量指标
 */
@ObjectType('DataQualityMetrics')
export class DataQualityMetrics {
  @Field(() => DataQualityLevel, { description: '质量等级' })
  level: DataQualityLevel;

  @Field(() => Float, { description: '完整性得分 (0-100)' })
  completenessScore: number;

  @Field(() => Float, { description: '准确性得分 (0-100)' })
  accuracyScore: number;

  @Field(() => Float, { description: '一致性得分 (0-100)' })
  consistencyScore: number;

  @Field(() => Float, { description: '时效性得分 (0-100)' })
  timelinessScore: number;

  @Field(() => Float, { description: '有效性得分 (0-100)' })
  validityScore: number;

  @Field(() => Float, { description: '总体质量得分 (0-100)' })
  overallScore: number;

  @Field(() => [String], { description: '发现的问题列表' })
  issues: string[];

  @Field(() => [String], { description: '改进建议' })
  recommendations: string[];

  @Field(() => String, { description: '上次评估时间' })
  lastAssessedAt: string;
}

/**
 * 增强的趋势数据点
 */
@ObjectType('EnhancedTrendDataPoint')
export class EnhancedTrendDataPoint {
  @Field(() => String, { description: '时间点' })
  timestamp: string;

  @Field(() => Int, { description: '数据量' })
  count: number;

  @Field(() => Int, { description: '成功量' })
  successful: number;

  @Field(() => Int, { description: '失败量' })
  failed: number;

  @Field(() => Float, { description: '成功率' })
  successRate: number;

  @Field(() => Float, { description: '平均质量得分' })
  avgQualityScore: number;

  @Field(() => Float, { nullable: true, description: '处理速度（条/分钟）' })
  processingSpeed?: number;

  @Field(() => String, { nullable: true, description: '状态分布' })
  statusDistribution?: string;
}

/**
 * 实时监控指标
 */
@ObjectType('RealtimeMetrics')
export class RealtimeMetrics {
  @Field(() => String, { description: '指标名称' })
  name: string;

  @Field(() => Float, { description: '当前值' })
  currentValue: number;

  @Field(() => Float, { nullable: true, description: '前一小时值' })
  previousHourValue?: number;

  @Field(() => Float, { nullable: true, description: '昨日同期值' })
  yesterdayValue?: number;

  @Field(() => Float, { description: '变化率（百分比）' })
  changeRate: number;

  @Field(() => String, { description: '趋势方向' })
  trend: 'up' | 'down' | 'stable';

  @Field(() => String, { description: '单位' })
  unit: string;

  @Field(() => String, { description: '最后更新时间' })
  lastUpdated: string;

  @Field(() => [Float], { description: '历史数据点（最近24小时）' })
  historicalData: number[];

  @Field(() => Float, { nullable: true, description: '阈值上限' })
  upperThreshold?: number;

  @Field(() => Float, { nullable: true, description: '阈值下限' })
  lowerThreshold?: number;

  @Field(() => Boolean, { description: '是否告警' })
  isAlerting: boolean;
}

/**
 * 系统健康状态
 */
@ObjectType('SystemHealth')
export class SystemHealth {
  @Field(() => String, { description: '整体状态' })
  status: 'healthy' | 'warning' | 'critical';

  @Field(() => Float, { description: '健康得分 (0-100)' })
  healthScore: number;

  @Field(() => Int, { description: '活跃数据源数量' })
  activeSources: number;

  @Field(() => Int, { description: '待处理数据量' })
  pendingData: number;

  @Field(() => Float, { description: '系统吞吐量（条/分钟）' })
  throughput: number;

  @Field(() => Float, { description: '平均响应时间（毫秒）' })
  avgResponseTime: number;

  @Field(() => Float, { description: '错误率（百分比）' })
  errorRate: number;

  @Field(() => String, { description: 'CPU使用率' })
  cpuUsage: string;

  @Field(() => String, { description: '内存使用率' })
  memoryUsage: string;

  @Field(() => String, { description: '磁盘使用率' })
  diskUsage: string;

  @Field(() => [String], { description: '活跃告警' })
  activeAlerts: string[];

  @Field(() => String, { description: '上次检查时间' })
  lastCheckedAt: string;
}

/**
 * 批量操作结果
 */
@ObjectType('BatchOperationResult')
export class BatchOperationResult {
  @Field(() => BatchOperationType, { description: '操作类型' })
  operationType: BatchOperationType;

  @Field(() => Int, { description: '总处理数量' })
  totalProcessed: number;

  @Field(() => Int, { description: '成功数量' })
  successful: number;

  @Field(() => Int, { description: '失败数量' })
  failed: number;

  @Field(() => Float, { description: '成功率' })
  successRate: number;

  @Field(() => [String], { nullable: true, description: '错误信息列表' })
  errors?: string[];

  @Field(() => String, { description: '开始时间' })
  startedAt: string;

  @Field(() => String, { description: '结束时间' })
  completedAt: string;

  @Field(() => Int, { description: '耗时（秒）' })
  duration: number;

  @Field(() => String, { nullable: true, description: '操作ID' })
  operationId?: string;

  @Field(() => String, { nullable: true, description: '导出文件URL' })
  exportFileUrl?: string;
}

/**
 * 增强的原始数据项
 */
@ObjectType('EnhancedRawDataItem')
export class EnhancedRawDataItem {
  @Field(() => ID, { description: '数据ID' })
  _id: string;

  @Field(() => String, { description: '数据源类型' })
  sourceType: string;

  @Field(() => String, { description: '源链接' })
  sourceUrl: string;

  @Field(() => String, { description: '内容预览' })
  contentPreview: string;

  @Field(() => String, { description: '内容哈希' })
  contentHash: string;

  @Field(() => EnhancedProcessingStatus, { description: '处理状态' })
  status: EnhancedProcessingStatus;

  @Field(() => String, { nullable: true, description: '错误信息' })
  errorMessage?: string;

  @Field(() => String, { description: '创建时间' })
  createdAt: string;

  @Field(() => String, { nullable: true, description: '处理时间' })
  processedAt?: string;

  @Field(() => String, { description: '元数据' })
  metadata: string;

  @Field(() => DataQualityMetrics, { description: '数据质量指标' })
  qualityMetrics: DataQualityMetrics;

  @Field(() => String, { description: '数据源域名' })
  sourceDomain: string;

  @Field(() => SourceRiskLevel, { description: '源风险等级' })
  sourceRiskLevel: SourceRiskLevel;

  @Field(() => Int, { description: '内容长度' })
  contentLength: number;

  @Field(() => Int, { nullable: true, description: '重试次数' })
  retryCount?: number;

  @Field(() => String, { nullable: true, description: '预计处理时间' })
  estimatedProcessingTime?: string;

  @Field(() => [String], { description: '关联数据ID列表' })
  relatedDataIds: string[];

  @Field(() => String, { description: '处理优先级' })
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * 增强的分页响应包装器
 */
@ObjectType('EnhancedPaginatedRawData')
export class EnhancedPaginatedRawData {
  @Field(() => [EnhancedRawDataItem], { description: '数据列表' })
  items: EnhancedRawDataItem[];

  @Field(() => Int, { description: '总数量' })
  total: number;

  @Field(() => Int, { description: '当前页码' })
  page: number;

  @Field(() => Int, { description: '每页数量' })
  pageSize: number;

  @Field(() => Int, { description: '总页数' })
  totalPages: number;

  @Field(() => Boolean, { description: '是否有下一页' })
  hasNext: boolean;

  @Field(() => Boolean, { description: '是否有上一页' })
  hasPrevious: boolean;

  @Field(() => String, { description: '查询耗时（毫秒）' })
  queryTime: string;

  @Field(() => [String], { description: '查询建议' })
  suggestions: string[];

  @Field(() => String, { nullable: true, description: '缓存标识' })
  cacheKey?: string;
}

/**
 * 增强的统计数据
 */
@ObjectType('EnhancedStatistics')
export class EnhancedStatistics {
  @Field(() => Int, { description: '待处理数据量' })
  pending: number;

  @Field(() => Int, { description: '处理中数据量' })
  processing: number;

  @Field(() => Int, { description: '已完成数据量' })
  completed: number;

  @Field(() => Int, { description: '失败数据量' })
  failed: number;

  @Field(() => Int, { description: '重试中数据量' })
  retrying: number;

  @Field(() => Int, { description: '已取消数据量' })
  cancelled: number;

  @Field(() => Int, { description: '已归档数据量' })
  archived: number;

  @Field(() => Int, { description: '总数据量' })
  total: number;

  @Field(() => Float, { description: '成功率' })
  successRate: number;

  @Field(() => Float, { description: '平均处理时间（秒）' })
  avgProcessingTime: number;

  @Field(() => Float, { description: '今日吞吐量（条/小时）' })
  todayThroughput: number;

  @Field(() => DataQualityMetrics, { description: '整体数据质量' })
  overallQuality: DataQualityMetrics;

  @Field(() => String, { description: '统计时间范围' })
  timeRange: string;

  @Field(() => String, { description: '上次更新时间' })
  lastUpdated: string;
}

/**
 * 数据导出配置
 */
@InputType('DataExportConfigInput')
export class DataExportConfig {
  @IsEnum(ExportFormat)
  @Field(() => ExportFormat, { description: '导出格式' })
  format: ExportFormat;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, description: '导出文件名' })
  filename?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true, description: '导出字段列表' })
  fields?: string[];

  @IsOptional()
  @Type(() => EnhancedRawDataFilter)
  @Field(() => EnhancedRawDataFilter, { nullable: true, description: '数据过滤条件' })
  filter?: EnhancedRawDataFilter;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否包含压缩' })
  compress?: boolean;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否分片导出' })
  chunked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(100000)
  @Field(() => Int, { nullable: true, description: '分片大小' })
  chunkSize?: number;

  @IsOptional()
  @IsEmail()
  @Field(() => String, { nullable: true, description: '导出完成通知邮箱' })
  notificationEmail?: string;
}

/**
 * 批量操作输入
 */
@InputType('BatchOperationInput')
export class BatchOperationInput {
  @IsEnum(BatchOperationType)
  @Field(() => BatchOperationType, { description: '操作类型' })
  operationType: BatchOperationType;

  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { description: '数据ID列表' })
  dataIds: string[];

  @IsOptional()
  @Type(() => EnhancedRawDataFilter)
  @Field(() => EnhancedRawDataFilter, { nullable: true, description: '批量过滤条件（与dataIds二选一）' })
  filter?: EnhancedRawDataFilter;

  @IsOptional()
  @Field(() => String, { nullable: true, description: '目标状态（用于状态更新操作）' })
  targetStatus?: EnhancedProcessingStatus;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否强制执行' })
  force?: boolean;

  @IsOptional()
  @Field(() => String, { nullable: true, description: '操作原因' })
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @Field(() => Int, { nullable: true, description: '批次大小' })
  batchSize?: number;
}

/**
 * 数据质量分析配置
 */
@InputType('DataQualityAnalysisInput')
export class DataQualityAnalysisConfig {
  @IsOptional()
  @Type(() => EnhancedRawDataFilter)
  @Field(() => EnhancedRawDataFilter, { nullable: true, description: '分析数据范围' })
  filter?: EnhancedRawDataFilter;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true, description: '分析维度' })
  dimensions?: string[];

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否生成详细报告' })
  detailedReport?: boolean;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: '是否包含改进建议' })
  includeRecommendations?: boolean;

  @IsOptional()
  @IsEnum(ExportFormat)
  @Field(() => ExportFormat, { nullable: true, description: '报告导出格式' })
  reportFormat?: ExportFormat;
}

/**
 * 数据质量分析结果
 */
@ObjectType('DataQualityAnalysisResult')
export class DataQualityAnalysisResult {
  @Field(() => String, { description: '分析ID' })
  analysisId: string;

  @Field(() => String, { description: '分析时间范围' })
  timeRange: string;

  @Field(() => Int, { description: '分析的数据总量' })
  totalAnalyzed: number;

  @Field(() => DataQualityMetrics, { description: '整体质量指标' })
  overallQuality: DataQualityMetrics;

  @Field(() => [String], { description: '发现的主要问题' })
  keyIssues: string[];

  @Field(() => [String], { description: '改进建议' })
  recommendations: string[];

  @Field(() => Float, { description: '质量趋势（过去30天）' })
  qualityTrend: number;

  @Field(() => String, { nullable: true, description: '详细报告URL' })
  detailedReportUrl?: string;

  @Field(() => String, { description: '分析完成时间' })
  completedAt: string;

  @Field(() => String, { description: '下次建议分析时间' })
  nextAnalysisDue: string;
}