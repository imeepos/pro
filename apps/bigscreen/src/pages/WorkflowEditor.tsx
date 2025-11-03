import React, { useState } from 'react';
import { WorkflowCanvas } from '@pro/workflow-react';
import { Card } from '@/components/ui/Card';

/**
 * 工作流编辑器页面
 *
 * 展示如何使用@pro/workflow-react组件
 */
const WorkflowEditor: React.FC = () => {
  const [workflowData] = useState({
    nodes: [],
    edges: []
  });

  const handleSave = () => {
    console.log('Saving workflow:', workflowData);
    // 这里可以添加保存逻辑
  };

  const handleLoad = () => {
    // 这里可以添加加载逻辑
    console.log('Loading workflow...');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            工作流编辑器
          </h1>
          <p className="text-gray-600">
            基于@pro/workflow-react的可视化工作流编辑器
          </p>
        </div>

        <div className="mb-4 flex gap-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存工作流
          </button>
          <button
            onClick={handleLoad}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            加载工作流
          </button>
        </div>

        <Card className="h-[800px]">
          <WorkflowCanvas />
        </Card>
      </div>
    </div>
  );
};

export default WorkflowEditor;