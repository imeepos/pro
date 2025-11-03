import { useState, useMemo } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { createWorkflowFromTemplate } from '@/utils/workflow-serializer';
import { workflowTemplates, getTemplatesByCategory } from '@/templates/workflow-templates';
import { getAllExtendedBlueprints } from '@/templates/node-definitions';
import type { WorkflowTemplate } from '@/templates/workflow-templates';

interface TemplateSelectorProps {
  onSelect?: (template: WorkflowTemplate) => void;
  onClose?: () => void;
}

export const TemplateSelector = ({ onSelect, onClose }: TemplateSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  const { setState } = useWorkflowStore();

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(workflowTemplates.map(t => t.category))];
    return cats.map(cat => ({
      value: cat,
      label: cat === 'all' ? '全部模板' : getCategoryLabel(cat),
      count: cat === 'all' ? workflowTemplates.length : getTemplatesByCategory(cat as any).length
    }));
  }, []);

  // 过滤模板
  const filteredTemplates = useMemo(() => {
    let templates = workflowTemplates;

    // 按分类过滤
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory as any);
    }

    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    return templates;
  }, [searchTerm, selectedCategory]);

  // 应用模板
  const handleApplyTemplate = (template: WorkflowTemplate) => {
    const blueprints = getAllExtendedBlueprints();
    const { nodes, edges } = createWorkflowFromTemplate(template, blueprints);

    setState({
      nodes,
      edges,
      blueprints
    });

    onSelect?.(template);
    onClose?.();
  };

  // 预览模板
  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">选择工作流模板</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* 侧边栏 - 分类和搜索 */}
          <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto">
            {/* 搜索框 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索模板
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入关键词搜索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* 分类筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                模板分类
              </label>
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category.label}</span>
                      <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 主内容区 - 模板列表 */}
          <div className="flex-1 flex flex-col">
            {!selectedTemplate ? (
              <>
                <div className="p-6 border-b bg-white">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {filteredTemplates.length} 个模板
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    选择一个模板开始创建工作流
                  </p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">未找到匹配的模板</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        尝试调整搜索条件或选择其他分类
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTemplates.map(template => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onPreview={() => handlePreviewTemplate(template)}
                          onApply={() => handleApplyTemplate(template)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <TemplatePreview
                template={selectedTemplate}
                onBack={() => setSelectedTemplate(null)}
                onApply={() => handleApplyTemplate(selectedTemplate)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 模板卡片组件
interface TemplateCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onApply: () => void;
}

const TemplateCard = ({ template, onPreview, onApply }: TemplateCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getCategoryColor(template.category)}`} />
          <span className="text-xs font-medium text-gray-500">
            {getCategoryLabel(template.category)}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {template.blueprint.nodes.length} 节点
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
            +{template.tags.length - 3}
          </span>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          预览
        </button>
        <button
          onClick={onApply}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          使用模板
        </button>
      </div>
    </div>
  );
};

// 模板预览组件
interface TemplatePreviewProps {
  template: WorkflowTemplate;
  onBack: () => void;
  onApply: () => void;
}

const TemplatePreview = ({ template, onBack, onApply }: TemplatePreviewProps) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">{getCategoryLabel(template.category)}</span>
                <span className="text-sm text-gray-500">
                  {template.blueprint.nodes.length} 节点, {template.blueprint.edges.length} 连接
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            使用此模板
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-3">模板描述</h4>
          <p className="text-gray-600 mb-6">{template.description}</p>

          <h4 className="font-medium text-gray-900 mb-3">标签</h4>
          <div className="flex flex-wrap gap-2 mb-6">
            {template.tags.map(tag => (
              <span
                key={tag}
                className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <h4 className="font-medium text-gray-900 mb-3">工作流结构</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">节点列表</h5>
                <ul className="space-y-1">
                  {template.blueprint.nodes.map(node => (
                    <li key={node.id} className="text-sm text-gray-600 flex items-center">
                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(template.category)} mr-2`} />
                      {node.blueprintId}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">连接关系</h5>
                <ul className="space-y-1">
                  {template.blueprint.edges.map((edge, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {edge.source} → {edge.target}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 辅助函数
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'data-processing': '数据处理',
    'web-crawling': '网络爬虫',
    'monitoring': '监控任务',
    'analytics': '数据分析',
    'automation': '自动化'
  };
  return labels[category] || category;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'data-processing': 'bg-blue-500',
    'web-crawling': 'bg-green-500',
    'monitoring': 'bg-yellow-500',
    'analytics': 'bg-purple-500',
    'automation': 'bg-red-500'
  };
  return colors[category] || 'bg-gray-500';
}