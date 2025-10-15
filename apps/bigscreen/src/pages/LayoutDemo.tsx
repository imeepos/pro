import React, { useState } from 'react';
import { LayoutDesigner } from '../components/layout/LayoutDesigner';
import { LayoutConfig } from '../stores/useLayoutStore';

export const LayoutDemo: React.FC = () => {
  const [savedLayout, setSavedLayout] = useState<LayoutConfig | null>(null);

  const handleSaveLayout = (layout: LayoutConfig) => {
    setSavedLayout(layout);
    // Layout saved successfully
    // 这里可以添加保存到后端的逻辑
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <LayoutDesigner onSave={handleSaveLayout} />
      
      {/* 调试信息 */}
      {savedLayout && (
        <div className="p-4 bg-white border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-2">最近保存的布局:</h3>
          <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(savedLayout, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};