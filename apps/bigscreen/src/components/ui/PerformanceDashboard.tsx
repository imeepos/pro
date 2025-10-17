/**
 * 性能监控仪表板组件
 * 显示应用性能指标和优化建议
 */

import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Monitor, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useGlobalPerformance, usePageLoadPerformance, useResourcePerformance } from '@/hooks/usePerformance';
import { cn } from '@/utils';

interface PerformanceDashboardProps {
  className?: string;
  compact?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'error';
  description?: string;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 性能指标卡片
 */
function MetricCard({ title, value, unit, icon, status, description, trend }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200',
  };

  const trendIcons = {
    up: <TrendingUp className="w-3 h-3 text-green-500" />,
    down: <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />,
    stable: <div className="w-3 h-0.5 bg-gray-400" />,
  };

  return (
    <div className={cn('p-4 rounded-lg border', statusColors[status])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {trend && trendIcons[trend]}
      </div>
      
      <div className="mt-2">
        <span className="text-2xl font-bold">
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        {unit && <span className="text-sm opacity-75 ml-1">{unit}</span>}
      </div>
      
      {description && (
        <p className="text-xs opacity-75 mt-1">{description}</p>
      )}
    </div>
  );
}

/**
 * Web Vitals 显示组件
 */
function WebVitalsSection({ webVitals }: { webVitals: any[] }) {
  if (!webVitals || webVitals.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>正在收集 Web Vitals 数据...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {webVitals.map((vital) => (
        <MetricCard
          key={vital.name}
          title={vital.name}
          value={vital.value}
          unit={vital.name === 'CLS' ? '' : 'ms'}
          icon={<Activity className="w-4 h-4" />}
          status={vital.rating === 'good' ? 'good' : vital.rating === 'needs-improvement' ? 'warning' : 'error'}
          description={`评级: ${vital.rating}`}
        />
      ))}
    </div>
  );
}

/**
 * 性能建议组件
 */
function RecommendationsSection({ recommendations }: { recommendations: string[] }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-green-800">性能表现良好，暂无优化建议</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.map((recommendation, index) => (
        <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <span className="text-yellow-800 text-sm">{recommendation}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 性能分数环形图
 */
function PerformanceScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 50) return '需要改进';
    return '较差';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* 背景圆环 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          {/* 进度圆环 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={getScoreColor(score)}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
            }}
          />
        </svg>
        
        {/* 分数文本 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', getScoreColor(score))}>
            {score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <div className={cn('text-sm font-medium', getScoreColor(score))}>
          {getScoreStatus(score)}
        </div>
        <div className="text-xs text-gray-500">性能评分</div>
      </div>
    </div>
  );
}

/**
 * 主性能仪表板组件
 */
export function PerformanceDashboard({ className, compact = false }: PerformanceDashboardProps) {
  const { report, memoryUsage, clearHistory } = useGlobalPerformance();
  const loadMetrics = usePageLoadPerformance();
  const resourceStats = useResourcePerformance();
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'resources'>('overview');

  const tabs: ReadonlyArray<{ key: 'overview' | 'details' | 'resources'; label: string; icon: React.ReactNode }> = [
    { key: 'overview', label: '概览', icon: <Monitor className="w-4 h-4" /> },
    { key: 'details', label: '详细指标', icon: <Activity className="w-4 h-4" /> },
    { key: 'resources', label: '资源加载', icon: <Database className="w-4 h-4" /> },
  ];

  if (!report) {
    return (
      <div className={cn('p-6 bg-white border border-gray-200 rounded-lg', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
            <p className="text-gray-500">正在收集性能数据...</p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('p-4 bg-white border border-gray-200 rounded-lg', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PerformanceScore score={report.score} />
            <div>
              <div className="text-sm font-medium">性能概览</div>
              <div className="text-xs text-gray-500">
                {report.webVitals.length} 项指标 • {report.recommendations.length} 条建议
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {memoryUsage.percentage && (
              <div className="text-right">
                <div className="text-sm font-medium">{memoryUsage.percentage}%</div>
                <div className="text-xs text-gray-500">内存使用</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold">性能监控</h3>
          <p className="text-sm text-gray-600">
            实时监控应用性能指标和优化建议
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            清除历史
          </button>
          <PerformanceScore score={report.score} />
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Web Vitals */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Core Web Vitals</h4>
              <WebVitalsSection webVitals={report.webVitals} />
            </div>

            {/* 内存使用 */}
            {memoryUsage.used && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">内存使用情况</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="已使用"
                    value={(memoryUsage.used / 1024 / 1024).toFixed(1)}
                    unit="MB"
                    icon={<Database className="w-4 h-4" />}
                    status={memoryUsage.percentage > 80 ? 'error' : memoryUsage.percentage > 60 ? 'warning' : 'good'}
                  />
                  <MetricCard
                    title="总内存"
                    value={(memoryUsage.total / 1024 / 1024).toFixed(1)}
                    unit="MB"
                    icon={<Database className="w-4 h-4" />}
                    status="good"
                  />
                  <MetricCard
                    title="使用率"
                    value={memoryUsage.percentage}
                    unit="%"
                    icon={<Activity className="w-4 h-4" />}
                    status={memoryUsage.percentage > 80 ? 'error' : memoryUsage.percentage > 60 ? 'warning' : 'good'}
                  />
                  <MetricCard
                    title="限制"
                    value={(memoryUsage.limit / 1024 / 1024).toFixed(0)}
                    unit="MB"
                    icon={<Database className="w-4 h-4" />}
                    status="good"
                  />
                </div>
              </div>
            )}

            {/* 优化建议 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">优化建议</h4>
              <RecommendationsSection recommendations={report.recommendations} />
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* 页面加载指标 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">页面加载性能</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="DNS查询"
                  value={loadMetrics.dns || 0}
                  unit="ms"
                  icon={<Clock className="w-4 h-4" />}
                  status={(loadMetrics.dns || 0) > 100 ? 'warning' : 'good'}
                />
                <MetricCard
                  title="TCP连接"
                  value={loadMetrics.tcp || 0}
                  unit="ms"
                  icon={<Clock className="w-4 h-4" />}
                  status={(loadMetrics.tcp || 0) > 200 ? 'warning' : 'good'}
                />
                <MetricCard
                  title="DOM就绪"
                  value={loadMetrics.domReady || 0}
                  unit="ms"
                  icon={<Clock className="w-4 h-4" />}
                  status={(loadMetrics.domReady || 0) > 2000 ? 'warning' : 'good'}
                />
                <MetricCard
                  title="页面加载"
                  value={loadMetrics.pageLoad || 0}
                  unit="ms"
                  icon={<Clock className="w-4 h-4" />}
                  status={(loadMetrics.pageLoad || 0) > 3000 ? 'warning' : 'good'}
                />
              </div>
            </div>

            {/* 最近指标 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">最近性能指标</h4>
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {report.metrics.slice(0, 10).map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{metric.name}</div>
                        <div className="text-xs text-gray-500">{metric.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {metric.value.toFixed(1)} {metric.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* 资源统计 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">资源加载统计</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="总资源数"
                  value={resourceStats.totalResources}
                  icon={<Database className="w-4 h-4" />}
                  status="good"
                />
                <MetricCard
                  title="总大小"
                  value={(resourceStats.totalSize / 1024 / 1024).toFixed(1)}
                  unit="MB"
                  icon={<Database className="w-4 h-4" />}
                  status={resourceStats.totalSize > 5 * 1024 * 1024 ? 'warning' : 'good'}
                />
                <MetricCard
                  title="大资源"
                  value={resourceStats.largeResources}
                  icon={<AlertTriangle className="w-4 h-4" />}
                  status={resourceStats.largeResources > 5 ? 'error' : resourceStats.largeResources > 2 ? 'warning' : 'good'}
                  description="> 1MB"
                />
                <MetricCard
                  title="慢资源"
                  value={resourceStats.slowResources}
                  icon={<Clock className="w-4 h-4" />}
                  status={resourceStats.slowResources > 3 ? 'error' : resourceStats.slowResources > 1 ? 'warning' : 'good'}
                  description="> 2秒"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
