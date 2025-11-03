import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { TemplateSelector } from './TemplateSelector';
import type { WorkflowTemplate } from '@/templates/workflow-templates';

export const Toolbar = () => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const {
    nodes,
    edges,
    workflowInfo,
    exportWorkflow,
    importWorkflow,
    reset,
    loadTemplate,
    saveAsTemplate
  } = useWorkflowStore();

  /**
   * 导出工作流
   */
  const handleExport = () => {
    try {
      const json = exportWorkflow(true);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflowInfo.name || 'workflow'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  /**
   * 导入工作流
   */
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const json = event.target?.result as string;
            const result = importWorkflow(json);

            if (result.warnings && result.warnings.length > 0) {
              alert(`导入成功，但有警告:\n${result.warnings.join('\n')}`);
            } else {
              alert('导入成功');
            }
          } catch (error) {
            alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  /**
   * 清空工作流
   */
  const handleReset = () => {
    if (confirm('确定要清空画布吗？此操作不可撤销。')) {
      reset();
    }
  };

  /**
   * 保存为模板
   */
  const handleSaveAsTemplate = () => {
    const name = prompt('请输入模板名称:', workflowInfo.name || '新模板');
    if (!name) return;

    const description = prompt('请输入模板描述:', '') || '';
    const category = prompt('请输入模板分类 (data-processing/web-crawling/monitoring/analytics/automation):', 'data-processing');
    const tagsInput = prompt('请输入标签 (用逗号分隔):', '');
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    try {
      const template = saveAsTemplate(name, description, category || 'data-processing', tags);
      alert(`模板 "${template.name}" 已保存`);
    } catch (error) {
      alert('保存模板失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  /**
   * 选择模板
   */
  const handleSelectTemplate = (template: WorkflowTemplate) => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!confirm('选择模板将替换当前工作流，是否继续？')) {
        return;
      }
    }
    loadTemplate(template);
  };

  return (
    <>
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <h2 className="text-lg font-semibold text-gray-800">工作流编辑器</h2>

        <div className="flex items-center text-sm text-gray-600 ml-4">
          <span>{nodes.length} 节点</span>
          <span className="mx-2">·</span>
          <span>{edges.length} 连接</span>
        </div>

        <div className="flex-1" />

        {/* 模板相关操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📋 模板库
          </button>

          <button
            onClick={handleSaveAsTemplate}
            disabled={nodes.length === 0}
            className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            💾 保存模板
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* 文件操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📁 导入
          </button>

          <button
            onClick={handleExport}
            disabled={nodes.length === 0}
            className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📤 导出
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* 画布操作 */}
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          🗑️ 清空
        </button>
      </div>

      {/* 模板选择器弹窗 */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </>
  );
};
