import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  PieChart, 
  Activity, 
  Map,
  Users,
  Calendar,
  List,
  Grid,
  TrendingUp,
  Target,
  Search,
  X,
  Check
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { renderComponent } from './LayoutComponentProvider';

export interface ComponentOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  preview?: React.ReactNode;
  tags: string[];
  dataTypes: string[];
  size: 'small' | 'medium' | 'large' | 'xlarge';
  minSize?: { w: number; h: number };
  defaultProps?: Record<string, any>;
}

interface ComponentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (component: ComponentOption) => void;
  areaType?: 'widget' | 'container';
  areaSize?: { w: number; h: number };
  allowedComponents?: string[];
  currentComponent?: string | null;
  className?: string;
}

// 可用组件库
const availableComponents: ComponentOption[] = [
  // 图表类组件
  {
    id: 'sentiment-trend-chart',
    name: '情感趋势图',
    category: 'chart',
    description: '显示情感数据的时间序列变化',
    icon: <TrendingUp className="w-5 h-5" />,
    tags: ['趋势', '情感', '时间序列'],
    dataTypes: ['sentiment', 'time-series'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'sentiment-pie-chart',
    name: '情感分布饼图',
    category: 'chart',
    description: '情感分类的饼图展示',
    icon: <PieChart className="w-5 h-5" />,
    tags: ['分布', '情感', '饼图'],
    dataTypes: ['sentiment', 'distribution'],
    size: 'small',
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'word-cloud',
    name: '词云图',
    category: 'chart',
    description: '热词可视化展示',
    icon: <Grid className="w-5 h-5" />,
    tags: ['词云', '热词', '文本'],
    dataTypes: ['text', 'keywords'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'geographic-map',
    name: '地理分布图',
    category: 'map',
    description: '地理位置数据可视化',
    icon: <Map className="w-5 h-5" />,
    tags: ['地图', '地理', '分布'],
    dataTypes: ['geographic', 'location'],
    size: 'large',
    minSize: { w: 3, h: 3 }
  },
  {
    id: 'GeographicChart',
    name: '地理图表',
    category: 'map',
    description: '交互式地理图表组件',
    icon: <Map className="w-5 h-5" />,
    tags: ['地图', '图表', '交互'],
    dataTypes: ['geographic', 'interactive'],
    size: 'large',
    minSize: { w: 3, h: 3 }
  },
  {
    id: 'event-timeline',
    name: '事件时间线',
    category: 'timeline',
    description: '事件的时间序列展示',
    icon: <Calendar className="w-5 h-5" />,
    tags: ['时间线', '事件', '历史'],
    dataTypes: ['events', 'timeline'],
    size: 'large',
    minSize: { w: 3, h: 3 }
  },
  {
    id: 'hot-events-list',
    name: '热点事件列表',
    category: 'list',
    description: '实时热点事件列表',
    icon: <List className="w-5 h-5" />,
    tags: ['列表', '事件', '实时'],
    dataTypes: ['events', 'real-time'],
    size: 'small',
    minSize: { w: 2, h: 3 }
  },
  {
    id: 'user-behavior-chart',
    name: '用户行为图',
    category: 'chart',
    description: '用户行为数据分析',
    icon: <Users className="w-5 h-5" />,
    tags: ['用户', '行为', '分析'],
    dataTypes: ['user', 'behavior'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'activity-heatmap',
    name: '活动热力图',
    category: 'chart',
    description: '活动频率热力图',
    icon: <Activity className="w-5 h-5" />,
    tags: ['热力图', '活动', '频率'],
    dataTypes: ['activity', 'frequency'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'kpi-metrics',
    name: 'KPI指标卡',
    category: 'metric',
    description: '关键指标展示卡片',
    icon: <Target className="w-5 h-5" />,
    tags: ['指标', 'KPI', '数据'],
    dataTypes: ['metrics', 'kpi'],
    size: 'small',
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'data-table',
    name: '数据表格',
    category: 'table',
    description: '结构化数据表格',
    icon: <BarChart3 className="w-5 h-5" />,
    tags: ['表格', '数据', '列表'],
    dataTypes: ['tabular', 'structured'],
    size: 'xlarge',
    minSize: { w: 3, h: 3 }
  }
];

const categoryColors: Record<string, string> = {
  'chart': 'bg-blue-100 text-blue-700 border-blue-200',
  'map': 'bg-green-100 text-green-700 border-green-200',
  'timeline': 'bg-purple-100 text-purple-700 border-purple-200',
  'list': 'bg-orange-100 text-orange-700 border-orange-200',
  'metric': 'bg-red-100 text-red-700 border-red-200',
  'table': 'bg-gray-100 text-gray-700 border-gray-200'
};

const sizeLabels: Record<string, string> = {
  'small': '小组件',
  'medium': '中组件',
  'large': '大组件',
  'xlarge': '超大组件'
};

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  areaSize,
  allowedComponents,
  currentComponent,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(currentComponent || null);

  // 过滤组件
  const filteredComponents = availableComponents.filter(component => {
    // 文本搜索
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // 分类过滤
    const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;

    // 允许的组件列表
    const isAllowed = !allowedComponents || allowedComponents.includes(component.id);

    // 尺寸适配检查
    const fitsSize = !areaSize || !component.minSize || 
                    (areaSize.w >= component.minSize.w && areaSize.h >= component.minSize.h);

    return matchesSearch && matchesCategory && isAllowed && fitsSize;
  });

  const categories = Array.from(new Set(availableComponents.map(c => c.category)));

  const handleSelect = (component: ComponentOption) => {
    setSelectedComponent(component.id);
    onSelect(component);
  };

  const renderComponentPreview = (component: ComponentOption) => {
    try {
      // 尝试渲染真实组件的缩略图版本
      return (
        <div className="w-full h-20 bg-gray-50 rounded border overflow-hidden">
          <div className="transform scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none">
            {renderComponent(component.id)}
          </div>
        </div>
      );
    } catch (error) {
      // 如果组件渲染失败，回退到原始预览
      return (
        <div className="w-full h-20 bg-gray-50 rounded border flex items-center justify-center">
          {component.icon}
          <span className="ml-2 text-xs text-gray-600">{component.name}</span>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={twMerge(
            'bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">选择组件</h2>
                <p className="text-sm text-gray-600 mt-1">
                  为当前区域选择合适的可视化组件
                  {areaSize && (
                    <span className="ml-2 text-blue-600">
                      (区域大小: {areaSize.w}×{areaSize.h})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 搜索和过滤 */}
            <div className="space-y-3">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索组件..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 分类过滤 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={twMerge(
                    'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  全部
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={twMerge(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize',
                      selectedCategory === category
                        ? categoryColors[category]
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 组件列表 */}
          <div className="p-6 overflow-y-auto max-h-96">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComponents.map((component) => (
                <motion.div
                  key={component.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={twMerge(
                    'border rounded-lg p-4 cursor-pointer transition-all duration-200',
                    selectedComponent === component.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                  onClick={() => handleSelect(component)}
                >
                  {/* 组件预览 */}
                  {renderComponentPreview(component)}

                  {/* 组件信息 */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800 flex items-center">
                        {component.icon}
                        <span className="ml-2">{component.name}</span>
                      </h3>
                      {selectedComponent === component.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {component.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={twMerge(
                        'px-2 py-1 rounded text-xs font-medium border',
                        categoryColors[component.category]
                      )}>
                        {component.category}
                      </span>
                      
                      <span className="text-xs text-gray-500">
                        {sizeLabels[component.size]}
                      </span>
                    </div>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1">
                      {component.tags.slice(0, 3).map(tag => (
                        <span 
                          key={tag}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredComponents.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <Search className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-gray-500">未找到匹配的组件</p>
                <p className="text-sm text-gray-400 mt-1">
                  尝试调整搜索条件或分类筛选
                </p>
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                找到 {filteredComponents.length} 个组件
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (selectedComponent) {
                      const component = availableComponents.find(c => c.id === selectedComponent);
                      if (component) {
                        handleSelect(component);
                        onClose();
                      }
                    }
                  }}
                  disabled={!selectedComponent}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  确认选择
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};