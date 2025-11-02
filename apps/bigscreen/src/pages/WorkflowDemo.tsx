import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  WorkflowCanvas,
  useWorkflowStore,
  generateBlueprintsFromWorkflowCore,
  serializeWorkflow,
  deserializeWorkflow,
  validateWorkflow,
  type NodeBlueprint
} from '@pro/workflow-react';
import { Save, Play, Pause, Undo2, Redo2, Download, Upload, Trash2 } from 'lucide-react';
import { cn, createLogger } from '@/utils';

const logger = createLogger('WorkflowDemo');

interface WorkflowDemoState {
  isPlaying: boolean;
  isDirty: boolean;
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
}

const WorkflowDemo: React.FC = () => {
  const [state, setState] = useState<WorkflowDemoState>({
    isPlaying: false,
    isDirty: false,
    validationResult: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const blueprints = useWorkflowStore((s) => s.blueprints);
  const reset = useWorkflowStore((s) => s.reset);
  const setStateStore = useWorkflowStore((s) => s.setState);

  // 初始化工作流组件
  useEffect(() => {
    const initializeWorkflows = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 从 workflow-core 生成节点蓝图
        const workflowBlueprints = generateBlueprintsFromWorkflowCore();

        setStateStore({
          blueprints: workflowBlueprints,
        });

        // 创建一个示例工作流
        const sampleWorkflow = createSampleWorkflow(Object.values(workflowBlueprints));
        setStateStore(sampleWorkflow);

        logger.info('Workflow demo initialized successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize workflow demo';
        logger.error('Workflow demo initialization failed', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkflows();
  }, [setStateStore]);

  // 验证工作流
  const validateWorkflowCallback = useCallback(async () => {
    const validation = await validateWorkflow(nodes, edges, {});
    const adaptedResult = {
      isValid: validation.success,
      errors: validation.errors.map(e => e.message),
      warnings: [] as string[],
    };
    setState(prev => ({ ...prev, validationResult: adaptedResult }));
    return adaptedResult;
  }, [nodes, edges]);

  // 实时验证
  useEffect(() => {
    if (!isLoading) {
      validateWorkflowCallback().then(adaptedResult => {
        setState(prev => ({
          ...prev,
          isDirty: nodes.length > 0 || edges.length > 0,
          validationResult: adaptedResult
        }));
      });
    }
  }, [nodes, edges, isLoading, validateWorkflowCallback]);

  // 保存工作流
  const handleSave = useCallback(() => {
    try {
      const serialized = serializeWorkflow(nodes, edges);
      localStorage.setItem('workflow-demo', JSON.stringify(serialized));
      setState(prev => ({ ...prev, isDirty: false }));
      logger.info('Workflow saved successfully');
    } catch (err) {
      logger.error('Failed to save workflow', err);
    }
  }, [nodes, edges]);

  // 加载工作流
  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem('workflow-demo');
      if (saved) {
        const deserialized = deserializeWorkflow(saved, blueprints);
        setStateStore({
          nodes: deserialized.nodes,
          edges: deserialized.edges
        });
        logger.info('Workflow loaded successfully');
      }
    } catch (err) {
      logger.error('Failed to load workflow', err);
    }
  }, [setStateStore, blueprints]);

  // 导出工作流
  const handleExport = useCallback(() => {
    try {
      const serialized = serializeWorkflow(nodes, edges);
      const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logger.info('Workflow exported successfully');
    } catch (err) {
      logger.error('Failed to export workflow', err);
    }
  }, [nodes, edges]);

  // 清空工作流
  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空当前工作流吗？此操作不可撤销。')) {
      reset();
      setState(prev => ({ ...prev, isDirty: false, validationResult: null }));
      logger.info('Workflow cleared');
    }
  }, [reset]);

  // 撤销/重做功能（简化版本）
  const handleUndo = useCallback(() => {
    // 这里可以实现撤销逻辑
    logger.info('Undo operation requested');
  }, []);

  const handleRedo = useCallback(() => {
    // 这里可以实现重做逻辑
    logger.info('Redo operation requested');
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // 统计信息
  const stats = useMemo(() => ({
    nodes: nodes.length,
    edges: edges.length,
    blueprints: Object.keys(blueprints).length,
    isValid: state.validationResult?.isValid ?? false,
    errors: state.validationResult?.errors.length ?? 0,
    warnings: state.validationResult?.warnings.length ?? 0,
  }), [nodes.length, edges.length, blueprints, state.validationResult]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" text="正在初始化工作流编辑器..." />
          <p className="text-gray-500 mt-4">正在加载组件和配置...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">初始化失败</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">工作流编辑器演示</h1>
              <p className="text-gray-600 mt-1">
                基于 @pro/workflow-react 的可视化工作流编辑器
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* 统计信息 */}
              <Card className="px-4 py-2 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    节点: <span className="font-semibold">{stats.nodes}</span>
                  </span>
                  <span className="text-gray-600">
                    连接: <span className="font-semibold">{stats.edges}</span>
                  </span>
                  <span className={cn(
                    "font-semibold",
                    stats.isValid ? "text-green-600" : "text-red-600"
                  )}>
                    {stats.isValid ? "有效" : "无效"}
                  </span>
                  {(stats.errors > 0 || stats.warnings > 0) && (
                    <span className="text-amber-600">
                      {stats.errors > 0 && `${stats.errors} 错误`}
                      {stats.errors > 0 && stats.warnings > 0 && ", "}
                      {stats.warnings > 0 && `${stats.warnings} 警告`}
                    </span>
                  )}
                </div>
              </Card>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={stats.nodes === 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={stats.nodes === 0}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={stats.nodes === 0}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoad}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={stats.nodes === 0}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!state.isDirty}
                  className={cn(
                    state.isDirty && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
                <Button
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                  disabled={!stats.isValid || stats.nodes === 0}
                  variant={state.isPlaying ? "destructive" : "default"}
                >
                  {state.isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      暂停
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      运行
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 工作流画布 */}
      <div className="h-[calc(100vh-88px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key="workflow-canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <WorkflowCanvas />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// 创建示例工作流
function createSampleWorkflow(blueprints: NodeBlueprint[]) {
  if (blueprints.length === 0) {
    return { nodes: [], edges: [] };
  }

  const sampleNodes = blueprints.slice(0, 3).map((blueprint, index) => ({
    id: `sample-node-${index}`,
    type: 'workflow' as const,
    position: { x: 200 + index * 250, y: 200 },
    data: {
      label: blueprint.name,
      blueprintId: blueprint.id,
      config: {},
      ports: blueprint.ports,
    },
  }));

  const sampleEdges = sampleNodes.length > 1 ? [
    {
      id: 'sample-edge-0',
      source: sampleNodes[0].id,
      target: sampleNodes[1].id,
      type: 'smoothstep' as const,
      data: {},
    }
  ] : [];

  return {
    nodes: sampleNodes,
    edges: sampleEdges,
  };
}

export default WorkflowDemo;