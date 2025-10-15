import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  Columns, 
  Square,
  Layout,
  Plus,
  Check,
  Copy,
  Trash2
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useLayoutStore, LayoutConfig, LayoutArea } from '../../stores/useLayoutStore';
import { GridItem } from './GridContainer';
import { useToast } from '../ui/Toast';

interface LayoutSelectorProps {
  onSelectLayout: (layout: LayoutConfig) => void;
  onCreateCustom: () => void;
  className?: string;
}

// 预设布局模板 (已清空)
// const layoutTemplates: LayoutTemplate[] = []; // Commented out unused variable

// 辅助函数：获取组件名称
const getComponentName = (item: GridItem | LayoutArea): string => {
  if ('component' in item) {
    if (typeof item.component === 'string') {
      return item.component;
    }
    if (item.component && typeof item.component === 'object' && 'name' in item.component) {
      return (item.component as { name: string }).name;
    }
  }
  if ('name' in item && item.name) {
    return item.name;
  }
  if ('title' in item && item.title) {
    return item.title;
  }
  return 'Unknown';
};

const categoryColors: Record<string, string> = {
  'dashboard': 'bg-blue-100 text-blue-700',
  'layout': 'bg-green-100 text-green-700',
  'monitoring': 'bg-yellow-100 text-yellow-700',
  'analytics': 'bg-purple-100 text-purple-700'
};

const categoryIcons: Record<string, React.ReactNode> = {
  'dashboard': <Grid className="w-4 h-4" />,
  'layout': <Columns className="w-4 h-4" />,
  'monitoring': <Square className="w-4 h-4" />,
  'analytics': <Layout className="w-4 h-4" />
};

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  onSelectLayout,
  onCreateCustom,
  className
}) => {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const { savedLayouts, deleteLayout } = useLayoutStore();
  const { success, warning } = useToast();

  // 使用统一的布局存储
  const allLayouts: LayoutConfig[] = savedLayouts;

  const categories = Array.from(new Set(allLayouts.map(l => l.category || 'custom')));
  const filteredLayouts = filter === 'all' 
    ? allLayouts 
    : allLayouts.filter(l => (l.category || 'custom') === filter);

  const handleSelectLayout = (layout: LayoutConfig) => {
    setSelectedLayout(layout.id);
    onSelectLayout(layout);
  };

  // 删除保存的布局
  const handleDeleteLayout = (id: string) => {
    const layout = savedLayouts.find(l => l.id === id);
    const layoutName = layout?.name || '未知布局';
    
    warning('确认删除', `确定要删除布局 "${layoutName}" 吗？此操作不可恢复。`, {
      action: {
        label: '确认删除',
        onClick: () => {
          deleteLayout(id);
          success('删除成功', `布局 "${layoutName}" 已被删除`);
        }
      }
    });
  };

  const renderLayoutPreview = (layout: LayoutConfig) => {
    const items = layout.items || layout.areas || [];
    return (
      <div className="w-full h-24 bg-gray-50 rounded border overflow-hidden relative">
        <div 
          className="grid gap-1 p-2 h-full"
          style={{ 
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            gridTemplateRows: 'repeat(8, 1fr)'
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-blue-200 rounded-sm flex items-center justify-center text-xs text-blue-700 border border-blue-300"
              style={{
                gridColumn: `${item.x + 1} / ${item.x + item.w + 1}`,
                gridRow: `${item.y + 1} / ${item.y + item.h + 1}`
              }}
            >
              {item.w >= 2 && item.h >= 1 ? getComponentName(item) : ''}
            </div>
          ))}
        </div>
        <div className="absolute top-1 right-1">
          <span className="text-2xl">{layout.thumbnail || '📊'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={twMerge('space-y-6', className)}>
      {/* 标题和过滤器 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">选择布局</h2>
          <p className="text-sm text-gray-600 mt-1">
            选择一个已保存的布局进行编辑，或创建新布局
          </p>
        </div>

        {/* 分类过滤器 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={twMerge(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filter === 'all' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            全部
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={twMerge(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center space-x-1',
                filter === category 
                  ? categoryColors[category] 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {categoryIcons[category]}
              <span className="capitalize">{category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 布局网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLayouts.map((layout) => (
          <motion.div
            key={layout.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={twMerge(
              'border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
              selectedLayout === layout.id 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => handleSelectLayout(layout)}
          >
            {/* 布局预览 */}
            {renderLayoutPreview(layout)}

            {/* 布局信息 */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">{layout.name}</h3>
                <div className="flex items-center space-x-1">
                  {layout.id !== 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayout(layout.id);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除布局"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {selectedLayout === layout.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2">
                {layout.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className={twMerge(
                  'px-2 py-1 rounded text-xs font-medium flex items-center space-x-1',
                  categoryColors[layout.category || 'custom']
                )}>
                  {categoryIcons[layout.category || 'custom']}
                  <span className="capitalize">{layout.category || 'custom'}</span>
                </span>
                
                <span className="text-xs text-gray-500">
                  {(layout.items || layout.areas || []).length} 个组件
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* 自定义布局选项 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 flex flex-col items-center justify-center text-center min-h-[200px]"
          onClick={onCreateCustom}
        >
          <Plus className="w-8 h-8 text-gray-400 mb-2" />
          <h3 className="font-medium text-gray-600 mb-1">新建布局</h3>
          <p className="text-sm text-gray-500">
            从空白画布开始创建新的布局
          </p>
        </motion.div>
      </div>

      {/* 选中布局的详细信息 */}
      <AnimatePresence>
        {selectedLayout && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            {(() => {
              const layout = allLayouts.find(l => l.id === selectedLayout);
              if (!layout) return null;
              
              return (
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">
                    已选择: {layout.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">布局组件:</span>
                      <ul className="mt-1 space-y-1">
                        {(layout.items || layout.areas || []).map((item) => (
                          <li key={item.id} className="text-blue-700">
                            • {getComponentName(item)} ({item.w}×{item.h})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">网格配置:</span>
                      <p className="text-blue-700 mt-1">
                        {layout.cols} 列网格系统
                      </p>
                      <button className="mt-2 flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm">
                        <Copy className="w-3 h-3" />
                        <span>复制配置</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};