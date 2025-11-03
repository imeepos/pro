import { useState, useMemo } from 'react';
import type { NodeBlueprint } from '@/types/canvas';

interface NodePaletteProps {
  blueprints: NodeBlueprint[];
  onDragStart: (blueprint: NodeBlueprint) => void;
}

export const NodePalette = ({ blueprints, onDragStart }: NodePaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(blueprints.map((bp) => bp.category));
    return ['all', ...Array.from(cats)];
  }, [blueprints]);

  const filteredBlueprints = useMemo(() => {
    return blueprints.filter((bp) => {
      const matchesSearch = bp.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || bp.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [blueprints, search, selectedCategory]);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="搜索节点..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 分类选择 */}
      <div className="p-3 border-b border-gray-200">
        <select
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? '全部分类' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredBlueprints.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">未找到节点</div>
        ) : (
          filteredBlueprints.map((blueprint) => (
            <div
              key={blueprint.id}
              draggable
              onDragStart={() => onDragStart(blueprint)}
              className="p-3 bg-white rounded-md border border-gray-200 cursor-grab hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-2">
                {blueprint.icon && <span className="text-lg">{blueprint.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">{blueprint.name}</div>
                  {blueprint.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{blueprint.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {blueprint.ports.input.length} 输入 · {blueprint.ports.output.length} 输出
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
