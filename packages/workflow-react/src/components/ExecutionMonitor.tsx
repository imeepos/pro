import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { WorkflowApiAdapter, type WorkflowExecutionResponse } from '@/api/workflow-api';
import type { WorkflowApiConfig } from '@/api/workflow-api';

interface ExecutionMonitorProps {
  apiConfig: WorkflowApiConfig;
  onExecutionComplete?: (response: WorkflowExecutionResponse) => void;
  onExecutionError?: (error: Error) => void;
}

export const ExecutionMonitor = ({ apiConfig, onExecutionComplete, onExecutionError }: ExecutionMonitorProps) => {
  const {
    nodes,
    edges,
    executionState,
    startExecution: storeStartExecution,
    stopExecution: storeStopExecution,
    updateExecutionProgress,
    addExecutionLog,
    updateNode
  } = useWorkflowStore();

  const [apiAdapter] = useState(() => new WorkflowApiAdapter(apiConfig));
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  useEffect(() => {
    // 组件卸载时清理API适配器
    return () => {
      apiAdapter.dispose();
    };
  }, [apiAdapter]);

  /**
   * 开始执行工作流
   */
  const startExecution = async () => {
    if (executionState.isRunning) return;

    try {
      storeStartExecution();

      const executionId = await apiAdapter.executeWorkflow(
        nodes,
        edges,
        {
          timeout: 300000, // 5分钟超时
          retryCount: 3,
          parallelism: 4,
          environment: {
            NODE_ENV: 'production'
          }
        },
        {
          onProgress: (progress) => {
            updateExecutionProgress(progress);
          },
          onNodeUpdate: (nodeId, status, result) => {
            // 更新节点状态
            updateNode(nodeId, {
              validation: {
                status: status === 'completed' ? 'valid' : status === 'failed' ? 'error' : 'valid',
                messages: status === 'failed' ? [result?.error || '执行失败'] : []
              }
            });

            // 添加执行日志
            addExecutionLog(nodeId, 'info', `节点状态: ${status}`);
          },
          onLog: (log) => {
            addExecutionLog(log.nodeId, log.level, log.message);
          },
          onComplete: (response) => {
            storeStopExecution();
            onExecutionComplete?.(response);
          },
          onError: (error) => {
            storeStopExecution();
            addExecutionLog('system', 'error', `执行失败: ${error.message}`);
            onExecutionError?.(error);
          }
        }
      );

      setCurrentExecutionId(executionId);
    } catch (error) {
      storeStopExecution();
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      addExecutionLog('system', 'error', `启动失败: ${errorMessage}`);
      onExecutionError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  /**
   * 停止执行工作流
   */
  const stopExecution = async () => {
    if (!executionState.isRunning || !currentExecutionId) return;

    try {
      await apiAdapter.stopExecution(currentExecutionId);
      storeStopExecution();
      addExecutionLog('system', 'warn', '用户手动停止执行');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '停止失败';
      addExecutionLog('system', 'error', errorMessage);
    }
  };

  /**
   * 清空执行日志
   */
  const clearLogs = () => {
    useWorkflowStore.setState(state => ({
      executionState: {
        ...state.executionState,
        logs: []
      }
    }));
  };

  /**
   * 获取节点状态样式
   */
  const getNodeStatusStyle = (nodeId: string) => {
    if (executionState.currentNodeIds.includes(nodeId)) {
      return 'bg-blue-500 animate-pulse';
    }
    if (executionState.completedNodeIds.includes(nodeId)) {
      return 'bg-green-500';
    }
    if (executionState.errorNodeIds.includes(nodeId)) {
      return 'bg-red-500';
    }
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 执行控制面板 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">执行监控</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${executionState.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {executionState.isRunning ? '执行中' : '已停止'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!executionState.isRunning ? (
              <button
                onClick={startExecution}
                disabled={nodes.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                开始执行
              </button>
            ) : (
              <button
                onClick={stopExecution}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                停止执行
              </button>
            )}
            <button
              onClick={clearLogs}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清空日志
            </button>
          </div>
        </div>

        {/* 进度条 */}
        {executionState.isRunning && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>执行进度</span>
              <span>{Math.round(executionState.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${executionState.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 执行状态概览 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{nodes.length}</div>
            <div className="text-sm text-gray-600">总节点数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{executionState.completedNodeIds.length}</div>
            <div className="text-sm text-gray-600">已完成</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{executionState.currentNodeIds.length}</div>
            <div className="text-sm text-gray-600">执行中</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{executionState.errorNodeIds.length}</div>
            <div className="text-sm text-gray-600">失败</div>
          </div>
        </div>
      </div>

      {/* 节点状态列表 */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">节点状态</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {nodes.map(node => (
            <div key={node.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
              <div className={`w-3 h-3 rounded-full ${getNodeStatusStyle(node.id)}`} />
              <span className="text-sm text-gray-700 truncate flex-1">{node.data.label}</span>
              <span className="text-xs text-gray-500">
                {executionState.completedNodeIds.includes(node.id) && '✓'}
                {executionState.currentNodeIds.includes(node.id) && '⚡'}
                {executionState.errorNodeIds.includes(node.id) && '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 执行日志 */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">执行日志</h4>
          <span className="text-xs text-gray-500">
            {executionState.logs.length} 条记录
          </span>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 h-64 overflow-y-auto">
          {executionState.logs.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">
              暂无执行日志
            </div>
          ) : (
            <div className="space-y-1">
              {executionState.logs.map((log, index) => (
                <div key={index} className="flex items-start space-x-2 text-xs">
                  <span className="text-gray-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
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
  );
};