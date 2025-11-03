import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
// import { WorkflowApiAdapter } from '@/api/workflow-api';
import type { WorkflowApiConfig } from '@/api/workflow-api';

interface ExecutionHistoryProps {
  apiConfig: WorkflowApiConfig;
}

interface ExecutionRecord {
  id: string;
  workflowName: string;
  status: 'completed' | 'failed' | 'cancelled' | 'running';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  logs: Array<{
    timestamp: string;
    nodeId: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
  }>;
}

export const ExecutionHistory = ({ apiConfig }: ExecutionHistoryProps) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    dateRange: '7d' as '1d' | '7d' | '30d' | 'all'
  });

  // const { executionState } = useWorkflowStore();

  // 加载执行历史
  const loadExecutionHistory = async () => {
    setLoading(true);
    try {
      // 这里应该调用实际的后端API获取历史记录
      // 暂时使用模拟数据
      const mockHistory: ExecutionRecord[] = [
        {
          id: 'exec-001',
          workflowName: 'CSV数据处理流程',
          status: 'completed',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3000000).toISOString(),
          duration: 600,
          nodeCount: 4,
          completedNodes: 4,
          failedNodes: 0,
          logs: [
            {
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              nodeId: 'system',
              level: 'info',
              message: '开始执行工作流'
            },
            {
              timestamp: new Date(Date.now() - 3300000).toISOString(),
              nodeId: 'csv-reader',
              level: 'info',
              message: '成功读取CSV文件，共1000条记录'
            },
            {
              timestamp: new Date(Date.now() - 3000000).toISOString(),
              nodeId: 'system',
              level: 'info',
              message: '工作流执行完成'
            }
          ]
        },
        {
          id: 'exec-002',
          workflowName: '电商产品爬虫',
          status: 'failed',
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 6000000).toISOString(),
          duration: 1200,
          nodeCount: 5,
          completedNodes: 2,
          failedNodes: 1,
          logs: [
            {
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              nodeId: 'system',
              level: 'info',
              message: '开始执行工作流'
            },
            {
              timestamp: new Date(Date.now() - 6600000).toISOString(),
              nodeId: 'url-seeder',
              level: 'info',
              message: '种子URL生成完成，共50个URL'
            },
            {
              timestamp: new Date(Date.now() - 6000000).toISOString(),
              nodeId: 'playwright-crawler',
              level: 'error',
              message: '目标网站访问超时'
            }
          ]
        }
      ];

      setExecutions(mockHistory);
    } catch (error) {
      console.error('加载执行历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutionHistory();
  }, []);

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'running':
        return '⚡';
      case 'cancelled':
        return '⏹️';
      default:
        return '❓';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化持续时间
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
  };

  // 过滤执行记录
  const filteredExecutions = executions.filter(exec => {
    if (filter.status !== 'all' && exec.status !== filter.status) return false;

    if (filter.dateRange !== 'all') {
      const now = new Date();
      const execTime = new Date(exec.startedAt);
      const diffDays = (now.getTime() - execTime.getTime()) / (1000 * 60 * 60 * 24);

      switch (filter.dateRange) {
        case '1d':
          if (diffDays > 1) return false;
          break;
        case '7d':
          if (diffDays > 7) return false;
          break;
        case '30d':
          if (diffDays > 30) return false;
          break;
      }
    }

    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">执行历史</h3>
          <button
            onClick={loadExecutionHistory}
            disabled={loading}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center space-x-4 mt-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">状态:</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="completed">成功</option>
              <option value="failed">失败</option>
              <option value="running">运行中</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">时间:</label>
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter({ ...filter, dateRange: e.target.value as any })}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">最近1天</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="all">全部</option>
            </select>
          </div>
        </div>
      </div>

      {/* 执行列表 */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredExecutions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">暂无执行记录</div>
            <div className="text-sm">执行工作流后，历史记录将显示在这里</div>
          </div>
        ) : (
          filteredExecutions.map(execution => (
            <div
              key={execution.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedExecution(execution)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(execution.status)}</span>
                  <div>
                    <div className="font-medium text-gray-900">{execution.workflowName}</div>
                    <div className="text-sm text-gray-500">
                      {formatTime(execution.startedAt)}
                      {execution.duration && ` · ${formatDuration(execution.duration)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(execution.status)}`}>
                    {execution.status === 'completed' ? '成功' :
                     execution.status === 'failed' ? '失败' :
                     execution.status === 'running' ? '运行中' : '已取消'}
                  </span>

                  <div className="text-sm text-gray-500">
                    {execution.completedNodes}/{execution.nodeCount} 节点
                  </div>
                </div>
              </div>

              {execution.failedNodes > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {execution.failedNodes} 个节点执行失败
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 执行详情弹窗 */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 详情头部 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedExecution.workflowName}
                  </h4>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>执行ID: {selectedExecution.id}</span>
                    <span>开始时间: {formatTime(selectedExecution.startedAt)}</span>
                    {selectedExecution.completedAt && (
                      <span>结束时间: {formatTime(selectedExecution.completedAt)}</span>
                    )}
                    {selectedExecution.duration && (
                      <span>执行时长: {formatDuration(selectedExecution.duration)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 执行统计 */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{selectedExecution.nodeCount}</div>
                  <div className="text-sm text-gray-600">总节点数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{selectedExecution.completedNodes}</div>
                  <div className="text-sm text-gray-600">已完成</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{selectedExecution.failedNodes}</div>
                  <div className="text-sm text-gray-600">失败</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedExecution.nodeCount - selectedExecution.completedNodes - selectedExecution.failedNodes}
                  </div>
                  <div className="text-sm text-gray-600">未执行</div>
                </div>
              </div>
            </div>

            {/* 执行日志 */}
            <div className="flex-1 p-6 overflow-y-auto">
              <h5 className="text-lg font-medium text-gray-900 mb-4">执行日志</h5>
              <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
                {selectedExecution.logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">暂无日志</div>
                ) : (
                  <div className="space-y-1">
                    {selectedExecution.logs.map((log, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs">
                        <span className="text-gray-500 font-mono">
                          {formatTime(log.timestamp).split(' ')[1]}
                        </span>
                        <span className={`font-medium ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          log.level === 'info' ? 'text-blue-400' :
                          'text-gray-400'
                        }`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-300 flex-1">
                          {log.nodeId !== 'system' && `[${log.nodeId}] `}
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};